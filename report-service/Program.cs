using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using ReportService.Data;
using ReportService.Services;
using ReportService.Repositories;
using ReportService.Infrastructure;
using ReportService.Models;
using FluentValidation;
using FluentValidation.AspNetCore;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using ReportService;

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
        logger.LogInformation("Received booking completed event: BookingId={BookingId}, VehicleId={VehicleId}, CoOwnerId={CoOwnerId}, Distance={Distance}, Cost={Cost}",
            bookingEvent.BookingId, bookingEvent.VehicleId, bookingEvent.CoOwnerId, bookingEvent.Distance, bookingEvent.Cost);

        // Update report data asynchronously - create UsageHistory and log to MongoDB
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = app.Services.CreateScope();
                var historyRepository = scope.ServiceProvider.GetRequiredService<IHistoryRepository>();

                // Validate data before creating UsageHistory
                if (bookingEvent.Distance <= 0)
                {
                    logger.LogWarning("Invalid distance ({Distance}) for booking {BookingId}. Skipping UsageHistory creation.",
                        bookingEvent.Distance, bookingEvent.BookingId);
                    return;
                }

                // Check if UsageHistory already exists for this booking
                var existingHistories = await historyRepository.GetUsageHistoriesByDateRangeAsync(
                    bookingEvent.CheckInTime.AddDays(-1), 
                    bookingEvent.CheckOutTime.AddDays(1));
                
                var existing = existingHistories.FirstOrDefault(h => 
                    h.VehicleId == bookingEvent.VehicleId && 
                    h.CoOwnerId == bookingEvent.CoOwnerId &&
                    Math.Abs((h.StartTime - bookingEvent.CheckInTime).TotalMinutes) < 5 &&
                    Math.Abs((h.EndTime - bookingEvent.CheckOutTime).TotalMinutes) < 5);
                
                if (existing != null)
                {
                    logger.LogInformation("UsageHistory already exists for booking {BookingId}: UsageHistoryId={UsageHistoryId}. Skipping creation.",
                        bookingEvent.BookingId, existing.Id);
                    return;
                }

                // Create UsageHistory from booking completed event
                // Ensure times are in UTC for database consistency
                var usageHistory = new UsageHistory
                {
                    VehicleId = bookingEvent.VehicleId,
                    CoOwnerId = bookingEvent.CoOwnerId,
                    StartTime = bookingEvent.CheckInTime.Kind == DateTimeKind.Utc 
                        ? bookingEvent.CheckInTime 
                        : bookingEvent.CheckInTime.ToUniversalTime(),
                    EndTime = bookingEvent.CheckOutTime.Kind == DateTimeKind.Utc 
                        ? bookingEvent.CheckOutTime 
                        : bookingEvent.CheckOutTime.ToUniversalTime(),
                    DistanceKm = (decimal)bookingEvent.Distance,
                    Cost = (decimal)bookingEvent.Cost,
                    EnergyConsumed = 0, // Will be calculated or updated later if available
                    StartBatteryLevel = 0, // Will be updated if available
                    EndBatteryLevel = 0, // Will be updated if available
                    Purpose = "Booking",
                    Notes = $"Booking ID: {bookingEvent.BookingId}",
                    CreatedAt = bookingEvent.CompletedAt.Kind == DateTimeKind.Utc 
                        ? bookingEvent.CompletedAt 
                        : bookingEvent.CompletedAt.ToUniversalTime(),
                    UpdatedAt = bookingEvent.CompletedAt.Kind == DateTimeKind.Utc 
                        ? bookingEvent.CompletedAt 
                        : bookingEvent.CompletedAt.ToUniversalTime(),
                    IsActive = true
                };

                await historyRepository.CreateUsageHistoryAsync(usageHistory);
                logger.LogInformation("Successfully created UsageHistory for booking {BookingId}: UsageHistoryId={UsageHistoryId}, VehicleId={VehicleId}, CoOwnerId={CoOwnerId}, Distance={Distance}, Cost={Cost}",
                    bookingEvent.BookingId, usageHistory.Id, bookingEvent.VehicleId, bookingEvent.CoOwnerId, bookingEvent.Distance, bookingEvent.Cost);

                // Also log to MongoDB
                await mongoService.LogAsync("booking_logs", new ReportLog
                {
                    Action = "BookingCompleted",
                    CoOwnerId = bookingEvent.CoOwnerId,
                    Details = $"BookingId: {bookingEvent.BookingId}, Distance: {bookingEvent.Distance}, Cost: {bookingEvent.Cost}"
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing booking completed event: BookingId={BookingId}, VehicleId={VehicleId}, CoOwnerId={CoOwnerId}, Distance={Distance}, Cost={Cost}. Exception: {Exception}",
                    bookingEvent.BookingId, bookingEvent.VehicleId, bookingEvent.CoOwnerId, bookingEvent.Distance, bookingEvent.Cost, ex.ToString());
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

    // Subscribe to cost share created/updated events
    rabbitMQService.SubscribeEvent<CostShareCreatedMessage>("costshare.created", (costShareEvent) =>
    {
        logger.LogInformation("Received cost share created event: CostShareId={CostShareId}, GroupId={GroupId}, VehicleId={VehicleId}, TotalAmount={TotalAmount}",
            costShareEvent.CostShareId, costShareEvent.GroupId, costShareEvent.VehicleId, costShareEvent.TotalAmount);

        // Update report data asynchronously - create CostRecords for each cost share detail
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = app.Services.CreateScope();
                var historyRepository = scope.ServiceProvider.GetRequiredService<IHistoryRepository>();
                var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
                var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
                var httpClient = httpClientFactory.CreateClient();
                
                var paymentServiceUrl = configuration["PaymentServiceUrl"] ?? "http://payment-service:80";
                
                // Get cost share details from payment service
                var detailsRequest = new HttpRequestMessage(HttpMethod.Get, $"{paymentServiceUrl}/api/costshares/{costShareEvent.CostShareId}/details");
                var detailsResponse = await httpClient.SendAsync(detailsRequest);
                
                if (!detailsResponse.IsSuccessStatusCode)
                {
                    logger.LogWarning("Failed to get cost share details for CostShareId={CostShareId}: {StatusCode}", 
                        costShareEvent.CostShareId, detailsResponse.StatusCode);
                    return;
                }
                
                var detailsJson = await detailsResponse.Content.ReadAsStringAsync();
                var details = JsonSerializer.Deserialize<List<CostShareDetailResponse>>(detailsJson, 
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<CostShareDetailResponse>();
                
                // Map GUID VehicleId/GroupId to int vehicleId (same way as in HistoryService)
                var vehicleId = Convert.ToInt32(costShareEvent.VehicleId.ToString().Replace("-", "").Substring(0, 8), 16);
                
                // Create CostRecord for each detail
                foreach (var detail in details)
                {
                    // Map GUID CoOwnerId to int coOwnerId
                    var userIdString = detail.UserId.ToString();
                    var coOwnerId = Convert.ToInt32(userIdString.Replace("-", "").Substring(0, 8), 16);
                    
                    // Determine CostType from Title (Maintenance, Fuel, etc.)
                    var costType = "Other";
                    if (costShareEvent.Title.Contains("Bảo dưỡng", StringComparison.OrdinalIgnoreCase) || 
                        costShareEvent.Title.Contains("Maintenance", StringComparison.OrdinalIgnoreCase))
                    {
                        costType = "Maintenance";
                    }
                    else if (costShareEvent.Title.Contains("Nhiên liệu", StringComparison.OrdinalIgnoreCase) || 
                             costShareEvent.Title.Contains("Fuel", StringComparison.OrdinalIgnoreCase))
                    {
                        costType = "Fuel";
                    }
                    
                    var costRecord = new CostRecord
                    {
                        VehicleId = vehicleId,
                        CoOwnerId = coOwnerId,
                        CostType = costType,
                        Description = costShareEvent.Title,
                        Amount = detail.Amount,
                        Currency = detail.Currency ?? costShareEvent.Currency,
                        ExpenseDate = costShareEvent.CreatedAt,
                        PaymentStatus = detail.Status == 2 ? PaymentStatus.Paid : PaymentStatus.Pending, // 2 = Completed (mapped to Paid)
                        Notes = detail.Notes,
                        CreatedAt = costShareEvent.CreatedAt,
                        UpdatedAt = costShareEvent.CreatedAt,
                        IsActive = true
                    };
                    
                    await historyRepository.CreateCostRecordAsync(costRecord);
                    logger.LogInformation("Created CostRecord for CostShareId={CostShareId}, DetailId={DetailId}, VehicleId={VehicleId}, CoOwnerId={CoOwnerId}, Amount={Amount}",
                        costShareEvent.CostShareId, detail.Id, vehicleId, coOwnerId, detail.Amount);
                }
                
                // Also log to MongoDB
                await mongoService.LogAsync("costshare_logs", new ReportLog
                {
                    Action = "CostShareCreated",
                    Details = $"CostShareId: {costShareEvent.CostShareId}, GroupId: {costShareEvent.GroupId}, TotalAmount: {costShareEvent.TotalAmount}, DetailsCount: {details.Count}"
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing cost share created event: CostShareId={CostShareId}, GroupId={GroupId}, VehicleId={VehicleId}. Exception: {Exception}",
                    costShareEvent.CostShareId, costShareEvent.GroupId, costShareEvent.VehicleId, ex.ToString());
            }
        });
    });
    
    rabbitMQService.SubscribeEvent<CostShareCreatedMessage>("costshare.updated", (costShareEvent) =>
    {
        logger.LogInformation("Received cost share updated event: CostShareId={CostShareId}, GroupId={GroupId}, VehicleId={VehicleId}, TotalAmount={TotalAmount}",
            costShareEvent.CostShareId, costShareEvent.GroupId, costShareEvent.VehicleId, costShareEvent.TotalAmount);

        // Update report data asynchronously - update CostRecords if needed
        _ = Task.Run(async () =>
        {
            try
            {
                // For now, just log to MongoDB. Can add update logic later if needed
                await mongoService.LogAsync("costshare_logs", new ReportLog
                {
                    Action = "CostShareUpdated",
                    Details = $"CostShareId: {costShareEvent.CostShareId}, GroupId: {costShareEvent.GroupId}, TotalAmount: {costShareEvent.TotalAmount}"
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error logging cost share updated event to MongoDB");
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
