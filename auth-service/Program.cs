using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using AuthService.Data;
using AuthService.Services;
using AuthService.Repositories;
using FluentValidation;
using FluentValidation.AspNetCore;
using AutoMapper;
using AuthService.Models;
using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);

// Thêm services vào container
builder.Services.AddControllers();

// Cấu hình Entity Framework
var defaultConn = builder.Configuration["ConnectionStrings:DefaultConnection"] 
                  ?? builder.Configuration.GetConnectionString("DefaultConnection")
                  ?? string.Empty;
if (string.IsNullOrWhiteSpace(defaultConn))
{
    throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");
}
builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseSqlServer(defaultConn));

// Đăng ký AutoMapper
builder.Services.AddAutoMapper(typeof(Program));

// Đăng ký FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Đăng ký các services và repositories
builder.Services.AddScoped<IAuthService, AuthService.Services.AuthService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

// Thêm HttpClientFactory để gọi ownership service
builder.Services.AddHttpClient();

// Cấu hình JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JWT");
var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret không được cấu hình");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// Cấu hình Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { 
        Title = "Auth Service API", 
        Version = "v1",
        Description = "API cho dịch vụ xác thực và phân quyền"
    });
    
    // Cấu hình JWT Authentication trong Swagger
    c.AddSecurityDefinition("Bearer", new()
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Nhập JWT token theo format: Bearer {token}"
    });
    
    c.AddSecurityRequirement(new()
    {
        {
            new()
            {
                Reference = new()
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Cấu hình CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Cấu hình port cho container
app.Urls.Add("http://0.0.0.0:80");

// Cấu hình pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Auth Service API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Tự động migrate database khi khởi động (với retry logic) và seed admin
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var maxRetries = 5;
    var retryCount = 0;

    while (retryCount < maxRetries)
    {
        try
        {
            await context.Database.MigrateAsync();
            logger.LogInformation("Auth database migrations applied successfully.");
            break;
        }
        catch (Exception ex)
        {
            if (ex is SqlException sqlEx && sqlEx.Number == 2714)
            {
                logger.LogWarning(ex, "Auth database schema already exists; skipping further migrations.");
                break;
            }

            retryCount++;
            logger.LogError(ex, "Auth database migration attempt {Attempt} failed.", retryCount);
            if (retryCount >= maxRetries)
            {
                logger.LogError(ex, "Max retries reached. Continuing without further migration attempts.");
                break;
            }
            await Task.Delay(TimeSpan.FromSeconds(5));
        }
    }

    try
    {
        var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
        if (adminRole == null)
        {
            adminRole = new Role { Name = "Admin", Description = "Quản trị viên hệ thống", CreatedAt = DateTime.UtcNow };
            context.Roles.Add(adminRole);
            await context.SaveChangesAsync();
        }

        var adminEmail = "admin@example.com";
        var existingAdmin = await context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == adminEmail);

        if (existingAdmin == null)
        {
            var passwordHash = BCrypt.Net.BCrypt.HashPassword("Admin@12345");
            var user = new User
            {
                Email = adminEmail,
                PasswordHash = passwordHash,
                FirstName = "System",
                LastName = "Admin",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            context.Users.Add(user);
            await context.SaveChangesAsync();

            context.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = adminRole.Id,
                AssignedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();
        }
        else if (!existingAdmin.UserRoles.Any(ur => ur.RoleId == adminRole.Id))
        {
            context.UserRoles.Add(new UserRole
            {
                UserId = existingAdmin.Id,
                RoleId = adminRole.Id,
                AssignedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Seeding admin failed.");
    }
}

app.Run();
