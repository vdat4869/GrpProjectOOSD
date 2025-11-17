using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.Services;
using PaymentService.Mappings;
using PaymentService.Validators;
using PaymentService.Hubs;
using PaymentService.Repositories;
using PaymentService.Repositories.Interfaces;
using FluentValidation;
using System.Reflection;
using Consul;
using Microsoft.Extensions.Diagnostics.HealthChecks;
// Microservice components removed for now
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Service", "PaymentService")
    .Enrich.WithProperty("Version", "1.0.0")
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Payment Service API",
        Version = "v1",
        Description = "Microservice for payment processing in EV Co-ownership system"
    });
});

// Database
builder.Services.AddDbContext<PaymentDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// MediatR
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));

// AutoMapper
builder.Services.AddAutoMapper(typeof(MappingProfile));

// FluentValidation
builder.Services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

// Repositories
builder.Services.AddScoped<IRepository<PaymentService.Models.Payment>, PaymentRepository>();
builder.Services.AddScoped<IRepository<PaymentService.Models.CostShare>, CostShareRepository>();
builder.Services.AddScoped<IRepository<PaymentService.Models.Transaction>, TransactionRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<ICostShareRepository, CostShareRepository>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();

// Services
builder.Services.AddScoped<PaymentService.Services.PaymentService>();
builder.Services.AddScoped<PaymentService.Services.CostSharingService>();
builder.Services.AddScoped<PaymentService.Services.PaymentGatewayService>();

// Basic Health Checks
builder.Services.AddHealthChecks();

// JWT Authentication
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.Authority = builder.Configuration["Jwt:Authority"];
        options.RequireHttpsMetadata = false; // Allow HTTP in development
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateAudience = false,
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes("your-super-secret-key-for-testing-only-32-chars"))
        };
    });

if (builder.Environment.IsDevelopment())
{
    // Allow all requests without auth in Development to simplify local testing
    builder.Services.AddAuthorization(options =>
    {
        var allowAll = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
            .RequireAssertion(_ => true)
            .Build();
        options.DefaultPolicy = allowAll;   // [Authorize] uses DefaultPolicy
        options.FallbackPolicy = allowAll;  // Endpoints without [Authorize]
    });
}
else
{
    builder.Services.AddAuthorization();
}

// SignalR
builder.Services.AddSignalR();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Memory Cache
builder.Services.AddMemoryCache();

// HttpClient for external API calls (VNPay service)
builder.Services.AddHttpClient();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Payment Service API v1");
        c.RoutePrefix = string.Empty; // Serve Swagger UI at root
    });
}

// Microservice Middleware
// app.UseMiddleware<DistributedTracingMiddleware>();

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

// Health Checks
app.MapHealthChecks("/health");

app.MapControllers();
app.MapHub<PaymentHub>("/paymentHub");

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<PaymentDbContext>();
    context.Database.EnsureCreated();
}

try
{
    Log.Information("Starting Payment Service");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Payment Service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
