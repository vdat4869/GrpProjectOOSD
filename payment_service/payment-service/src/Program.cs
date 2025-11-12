using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.Services;
using PaymentService.Mappings;
using PaymentService.Validators;
using PaymentService.Hubs;
using PaymentService.Repositories;
using PaymentService.Repositories.Interfaces;
using PaymentService.Infrastructure;
using FluentValidation;
using System.Reflection;
using Consul;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using System.Text;
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

// Infrastructure Services (Singleton)
builder.Services.AddSingleton<IRabbitMQService, RabbitMQService>();
builder.Services.AddSingleton<IRedisService, RedisService>();

// AI Service (HttpClient for calling AI Service)
builder.Services.AddHttpClient<IAiService, AiService>();
builder.Services.AddScoped<IAiService, AiService>();

// Basic Health Checks
builder.Services.AddHealthChecks();

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JWT");
var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret is not configured");

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.RequireHttpsMetadata = false; // Allow HTTP in development
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = true,
            ValidateIssuer = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
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

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

// Health Checks
app.MapHealthChecks("/health");

app.MapControllers();
app.MapHub<PaymentHub>("/paymentHub");

// Apply database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<PaymentDbContext>();
    try
    {
        context.Database.Migrate();
    }
    catch (Exception ex)
    {
        var loggerInit = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        loggerInit.LogError(ex, "Error migrating Payment database");
    }
}

// Subscribe to RabbitMQ events (services are Singleton, so they're available here)
var rabbitMQService = app.Services.GetRequiredService<IRabbitMQService>();
var logger = app.Services.GetRequiredService<ILogger<Program>>();

try
{
    // Subscribe to booking completed events
    rabbitMQService.SubscribeEvent<BookingCompletedEvent>("booking.completed", (bookingEvent) =>
    {
        logger.LogInformation("Received booking completed event: BookingId={BookingId}, CoOwnerId={CoOwnerId}",
            bookingEvent.BookingId, bookingEvent.CoOwnerId);

        // Process payment for completed booking asynchronously
        _ = Task.Run(async () =>
        {
            try
            {
                using var serviceScope = app.Services.CreateScope();
                // Here you would process the payment
                // var paymentService = serviceScope.ServiceProvider.GetRequiredService<PaymentService.Services.PaymentService>();
                // await paymentService.ProcessBookingPaymentAsync(bookingEvent);
                logger.LogInformation("Processing payment for booking {BookingId}", bookingEvent.BookingId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing booking payment");
            }
        });
    });

    Log.Information("Starting Payment Service with RabbitMQ integration");
}
catch (Exception ex)
{
    Log.Fatal(ex, "Error setting up RabbitMQ subscriptions");
}

try
{
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
