using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ReportService.Data;
using ReportService.Services;
using ReportService.Repositories;
using ReportService.Infrastructure;
using FluentValidation;
using FluentValidation.AspNetCore;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();

// Database
builder.Services.AddDbContext<ReportDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Infrastructure Services (Singleton - will live for the lifetime of the app)
builder.Services.AddSingleton<IRabbitMQService, RabbitMQService>();
builder.Services.AddSingleton<IMongoDbService, MongoDbService>();

// AutoMapper
builder.Services.AddAutoMapper(typeof(Program));

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Services and repositories
builder.Services.AddHttpClient();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IHistoryService, HistoryService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IHistoryRepository, HistoryRepository>();
builder.Services.AddScoped<IExportService, ExportService>();

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JWT");
var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret is not configured");

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

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddAuthorization(options =>
    {
        var allowAllPolicy = new AuthorizationPolicyBuilder()
            .RequireAssertion(_ => true)
            .Build();
        options.DefaultPolicy = allowAllPolicy;
        options.FallbackPolicy = allowAllPolicy;
    });
}
else
{
    builder.Services.AddAuthorization();
}

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Report Service API",
        Version = "v1",
        Description = "API for reporting and analytics in EV Co-ownership system"
    });

    // JWT Authentication in Swagger
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter JWT token in format: Bearer {token}"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// CORS
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

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Report Service API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Apply database migrations on startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ReportDbContext>();
    try
    {
        context.Database.Migrate();
    }
    catch (Exception ex)
    {
        var loggerInit = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        loggerInit.LogError(ex, "Error migrating Report database");
    }
}

// Subscribe to RabbitMQ events (services are Singleton, so they're available here)
var rabbitMQService = app.Services.GetRequiredService<IRabbitMQService>();
var mongoService = app.Services.GetRequiredService<IMongoDbService>();
var logger = app.Services.GetRequiredService<ILogger<Program>>();

try
{
    // Subscribe to payment processed events
    rabbitMQService.SubscribeEvent<PaymentProcessedEvent>("payment.processed", (paymentEvent) =>
    {
        logger.LogInformation("Received payment processed event: PaymentId={PaymentId}, CoOwnerId={CoOwnerId}",
            paymentEvent.PaymentId, paymentEvent.CoOwnerId);

        // Update report data asynchronously
        _ = Task.Run(async () =>
        {
            try
            {
                await mongoService.LogAsync("payment_logs", new ReportLog
                {
                    Action = "PaymentProcessed",
                    CoOwnerId = paymentEvent.CoOwnerId,
                    Details = $"PaymentId: {paymentEvent.PaymentId}, Amount: {paymentEvent.Amount}"
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error logging payment event to MongoDB");
            }
        });
    });

    // Subscribe to booking completed events
    rabbitMQService.SubscribeEvent<BookingCompletedEvent>("booking.completed", (bookingEvent) =>
    {
        logger.LogInformation("Received booking completed event: BookingId={BookingId}",
            bookingEvent.BookingId);

        // Update report data asynchronously
        _ = Task.Run(async () =>
        {
            try
            {
                await mongoService.LogAsync("booking_logs", new ReportLog
                {
                    Action = "BookingCompleted",
                    CoOwnerId = bookingEvent.CoOwnerId,
                    Details = $"BookingId: {bookingEvent.BookingId}, Distance: {bookingEvent.Distance}, Cost: {bookingEvent.Cost}"
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error logging booking event to MongoDB");
            }
        });
    });

    // Subscribe to user created events
    rabbitMQService.SubscribeEvent<UserCreatedEvent>("user.created", (userEvent) =>
    {
        logger.LogInformation("Received user created event: UserId={UserId}, Email={Email}",
            userEvent.UserId, userEvent.Email);

        // Update report data asynchronously
        _ = Task.Run(async () =>
        {
            try
            {
                await mongoService.LogAsync("user_logs", new ReportLog
                {
                    Action = "UserCreated",
                    Details = $"UserId: {userEvent.UserId}, Email: {userEvent.Email}, Roles: {string.Join(", ", userEvent.Roles)}"
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error logging user created event to MongoDB");
            }
        });
    });

    // Subscribe to vehicle group updated events
    rabbitMQService.SubscribeEvent<VehicleGroupUpdatedEvent>("vehicle.group.updated", (groupEvent) =>
    {
        logger.LogInformation("Received vehicle group updated event: VehicleGroupId={VehicleGroupId}, Status={Status}",
            groupEvent.VehicleGroupId, groupEvent.Status);

        // Update report data asynchronously
        _ = Task.Run(async () =>
        {
            try
            {
                await mongoService.LogAsync("vehicle_group_logs", new ReportLog
                {
                    Action = "VehicleGroupUpdated",
                    Details = $"VehicleGroupId: {groupEvent.VehicleGroupId}, Name: {groupEvent.Name}, Status: {groupEvent.Status}"
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error logging vehicle group updated event to MongoDB");
            }
        });
    });

    // Subscribe to ownership updated events
    rabbitMQService.SubscribeEvent<OwnershipUpdatedEvent>("ownership.updated", (ownershipEvent) =>
    {
        logger.LogInformation("Received ownership updated event: OwnershipId={OwnershipId}, CoOwnerId={CoOwnerId}, VehicleGroupId={VehicleGroupId}",
            ownershipEvent.OwnershipId, ownershipEvent.CoOwnerId, ownershipEvent.VehicleGroupId);

        // Update report data asynchronously
        _ = Task.Run(async () =>
        {
            try
            {
                await mongoService.LogAsync("ownership_logs", new ReportLog
                {
                    Action = "OwnershipUpdated",
                    Details = $"OwnershipId: {ownershipEvent.OwnershipId}, CoOwnerId: {ownershipEvent.CoOwnerId}, VehicleGroupId: {ownershipEvent.VehicleGroupId}, Percentage: {ownershipEvent.OwnershipPercentage}%, IsActive: {ownershipEvent.IsActive}"
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error logging ownership updated event to MongoDB");
            }
        });
    });

    logger.LogInformation("Report Service started with RabbitMQ and MongoDB integration");
}
catch (Exception ex)
{
    logger.LogError(ex, "Error setting up RabbitMQ subscriptions");
}

app.Run();
