using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using AuthService.Data;
using AuthService.Services;
using AuthService.Repositories;
using AuthService.Infrastructure;
using FluentValidation;
using FluentValidation.AspNetCore;
using AutoMapper;
using AuthService.Models;
using Microsoft.Data.SqlClient;

// Tạo WebApplication builder để cấu hình ứng dụng
var builder = WebApplication.CreateBuilder(args);

// ============================================
// CẤU HÌNH SERVICES VÀ DEPENDENCY INJECTION
// ============================================

// Thêm Controllers vào container với cấu hình JSON
// Sử dụng camelCase cho tên thuộc tính trong JSON response
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Đặt tên thuộc tính theo camelCase (ví dụ: firstName thay vì FirstName)
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Không format JSON với indentation để giảm kích thước response
        options.JsonSerializerOptions.WriteIndented = false;
    });

// ============================================
// CẤU HÌNH DATABASE (Entity Framework Core)
// ============================================

// Lấy connection string từ configuration
// Hỗ trợ nhiều cách cấu hình: ConnectionStrings:DefaultConnection hoặc GetConnectionString
var defaultConn = builder.Configuration["ConnectionStrings:DefaultConnection"] 
                  ?? builder.Configuration.GetConnectionString("DefaultConnection")
                  ?? string.Empty;

// Kiểm tra connection string có được cấu hình không
if (string.IsNullOrWhiteSpace(defaultConn))
{
    throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");
}

// Đăng ký DbContext với SQL Server
// DbContext này sẽ được inject vào các service/repository khi cần
builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseSqlServer(defaultConn));

// ============================================
// CẤU HÌNH AUTO MAPPER
// ============================================

// Đăng ký AutoMapper để tự động map giữa Entity và DTO
// AutoMapper sẽ quét tất cả Profile trong assembly
builder.Services.AddAutoMapper(typeof(Program));

// ============================================
// CẤU HÌNH FLUENT VALIDATION
// ============================================

// Bật tự động validate request models
builder.Services.AddFluentValidationAutoValidation();
// Đăng ký tất cả validators trong assembly
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// ============================================
// ĐĂNG KÝ SERVICES VÀ REPOSITORIES
// ============================================

// Đăng ký các service với lifetime Scoped (một instance mới cho mỗi HTTP request)
builder.Services.AddScoped<IAuthService, AuthService.Services.AuthService>(); // Service xử lý authentication
builder.Services.AddScoped<IJwtService, JwtService>(); // Service tạo và validate JWT tokens
builder.Services.AddScoped<IUserRepository, UserRepository>(); // Repository truy cập dữ liệu User
builder.Services.AddScoped<ISessionService, SessionService>(); // Service quản lý user sessions

// Thêm HttpClientFactory để gọi các service khác (như ownership-service)
// HttpClientFactory quản lý connection pooling và lifecycle của HttpClient
builder.Services.AddHttpClient();

// ============================================
// CẤU HÌNH INFRASTRUCTURE SERVICES
// ============================================

// Đăng ký RabbitMQ Service với Singleton lifetime (một instance duy nhất cho toàn bộ ứng dụng)
// RabbitMQ connection nên được giữ sống trong suốt lifecycle của ứng dụng
builder.Services.AddSingleton<IRabbitMQService, RabbitMQService>();

// ============================================
// CẤU HÌNH JWT AUTHENTICATION
// ============================================

// Lấy cấu hình JWT từ appsettings.json
var jwtSettings = builder.Configuration.GetSection("JWT");
var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret không được cấu hình");

// Cấu hình JWT Bearer Authentication
// Middleware này sẽ tự động validate JWT token trong Authorization header
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Cấu hình các tham số validate token
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, // Kiểm tra Issuer (người phát hành token)
            ValidateAudience = true, // Kiểm tra Audience (đối tượng nhận token)
            ValidateLifetime = true, // Kiểm tra token còn hạn không
            ValidateIssuerSigningKey = true, // Kiểm tra chữ ký của token
            ValidIssuer = jwtSettings["Issuer"], // Issuer hợp lệ
            ValidAudience = jwtSettings["Audience"], // Audience hợp lệ
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)), // Key để verify chữ ký
            ClockSkew = TimeSpan.Zero // Không cho phép sai lệch thời gian (tăng tính bảo mật)
        };
    });

// Thêm Authorization middleware
builder.Services.AddAuthorization();

// ============================================
// CẤU HÌNH SWAGGER/OPENAPI
// ============================================

// Thêm Swagger để document API
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // Cấu hình thông tin API
    c.SwaggerDoc("v1", new() { 
        Title = "Auth Service API", 
        Version = "v1",
        Description = "API cho dịch vụ xác thực và phân quyền"
    });
    
    // Cấu hình JWT Authentication trong Swagger UI
    // Cho phép test API với JWT token trực tiếp trên Swagger
    c.AddSecurityDefinition("Bearer", new()
    {
        Name = "Authorization", // Tên header
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey, // Loại: API Key
        Scheme = "Bearer", // Scheme: Bearer
        BearerFormat = "JWT", // Format: JWT
        In = Microsoft.OpenApi.Models.ParameterLocation.Header, // Vị trí: Header
        Description = "Nhập JWT token theo format: Bearer {token}"
    });
    
    // Yêu cầu tất cả endpoints sử dụng Bearer authentication
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
            Array.Empty<string>() // Không giới hạn scope
        }
    });
});

// ============================================
// CẤU HÌNH CORS (Cross-Origin Resource Sharing)
// ============================================

// Cho phép frontend từ bất kỳ origin nào gọi API
// Lưu ý: Trong production nên giới hạn origin cụ thể
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin() // Cho phép mọi origin
              .AllowAnyHeader() // Cho phép mọi header
              .AllowAnyMethod(); // Cho phép mọi HTTP method (GET, POST, PUT, DELETE, etc.)
    });
});

// ============================================
// BUILD VÀ CẤU HÌNH APPLICATION PIPELINE
// ============================================

var app = builder.Build();

// Cấu hình port cho container
// 0.0.0.0 cho phép lắng nghe trên tất cả network interfaces
app.Urls.Add("http://0.0.0.0:80");

// Cấu hình middleware pipeline
// Thứ tự middleware rất quan trọng!

// Chỉ bật Swagger trong môi trường Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger(); // Middleware để serve Swagger JSON
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Auth Service API v1");
        c.RoutePrefix = "swagger"; // Truy cập Swagger UI tại /swagger
    });
}

// Redirect HTTP sang HTTPS (nếu có HTTPS)
app.UseHttpsRedirection();

// Cho phép CORS
app.UseCors("AllowAll");

// Xác thực user (phải đặt trước UseAuthorization)
app.UseAuthentication();

// Kiểm tra quyền truy cập (authorization)
app.UseAuthorization();

// Map các controllers
app.MapControllers();

// ============================================
// TỰ ĐỘNG MIGRATE DATABASE VÀ SEED DATA
// ============================================

// Tạo scope để truy cập scoped services (DbContext)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    // Cấu hình retry logic cho database migration
    // Database có thể chưa sẵn sàng ngay khi service khởi động
    var maxRetries = 5; // Số lần thử tối đa
    var retryCount = 0;

    // Thử migrate database với retry logic
    while (retryCount < maxRetries)
    {
        try
        {
            // Áp dụng tất cả pending migrations
            await context.Database.MigrateAsync();
            logger.LogInformation("Auth database migrations applied successfully.");
            break; // Thành công, thoát khỏi vòng lặp
        }
        catch (Exception ex)
        {
            // Nếu schema đã tồn tại (SQL Server error 2714), bỏ qua
            if (ex is SqlException sqlEx && sqlEx.Number == 2714)
            {
                logger.LogWarning(ex, "Auth database schema already exists; skipping further migrations.");
                break;
            }

            // Tăng số lần thử và log lỗi
            retryCount++;
            logger.LogError(ex, "Auth database migration attempt {Attempt} failed.", retryCount);
            
            // Nếu đã thử hết số lần, dừng lại
            if (retryCount >= maxRetries)
            {
                logger.LogError(ex, "Max retries reached. Continuing without further migration attempts.");
                break;
            }
            
            // Đợi 5 giây trước khi thử lại
            await Task.Delay(TimeSpan.FromSeconds(5));
        }
    }

    // ============================================
    // SEED ADMIN USER VÀ ROLE
    // ============================================
    
    try
    {
        // Kiểm tra và tạo Admin Role nếu chưa có
        var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
        if (adminRole == null)
        {
            adminRole = new Role 
            { 
                Name = "Admin", 
                Description = "Quản trị viên hệ thống", 
                CreatedAt = DateTime.UtcNow 
            };
            context.Roles.Add(adminRole);
            await context.SaveChangesAsync();
        }

        // Kiểm tra và tạo Admin User nếu chưa có
        var adminEmail = "admin@example.com";
        var existingAdmin = await context.Users
            .Include(u => u.UserRoles) // Load UserRoles
            .ThenInclude(ur => ur.Role) // Load Role của mỗi UserRole
            .FirstOrDefaultAsync(u => u.Email == adminEmail);

        if (existingAdmin == null)
        {
            // Tạo admin user mới
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

            // Gán Admin role cho user
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
            // Nếu admin đã tồn tại nhưng chưa có Admin role, gán role
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
        // Log lỗi nhưng không crash ứng dụng
        logger.LogError(ex, "Seeding admin failed.");
    }
}

// Chạy ứng dụng
app.Run();
