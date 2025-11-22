using BookingService.Data;
using BookingService.Repositories;
using BookingService.Services;
using BookingService.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.Extensions.Configuration;

// Tạo builder cho ứng dụng ASP.NET Core
var builder = WebApplication.CreateBuilder(args);

// Thêm các services vào container
// Cấu hình controllers với JSON options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Đảm bảo DateTime được serialize theo ISO 8601 format với timezone
        // Thêm converter để serialize enum dưới dạng string thay vì số
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        // DateTime sẽ được serialize dưới dạng ISO 8601 (ví dụ: "2024-11-15T10:30:00Z")
    });

// Cấu hình Swagger với custom DateTime schema filter
// Filter này giúp Swagger hiển thị đúng format DateTime trong API documentation
builder.Services.AddSwaggerGen(c =>
{
    c.SchemaFilter<DateTimeDefaultSchemaFilter>();
});

// Đăng ký Background Service để tự động cập nhật trạng thái booking
// Service này chạy nền và kiểm tra các booking cần cập nhật trạng thái
builder.Services.AddHostedService<BookingService.Infrastructure.BookingStatusBackgroundService>();

// Cấu hình Database Context
// Kết nối đến SQL Server database sử dụng connection string từ appsettings.json
builder.Services.AddDbContext<BookingDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Đăng ký repository cho BookingHistory (lịch sử booking)
builder.Services.AddScoped<IBookingHistoryRepository, BookingHistoryRepository>();


// Cấu hình JWT Authentication
// Đọc cấu hình JWT từ appsettings.json
var jwtSettings = builder.Configuration.GetSection("JWT");
var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret is not configured");

// Đăng ký authentication với JWT Bearer token
builder.Services.AddAuthentication(options =>
{
    // Sử dụng JWT Bearer làm scheme mặc định cho authentication và challenge
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // Cấu hình các tham số validation cho JWT token
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,              // Xác thực issuer (người phát hành token)
        ValidateAudience = true,            // Xác thực audience (đối tượng nhận token)
        ValidateLifetime = true,             // Kiểm tra thời gian hết hạn của token
        ValidateIssuerSigningKey = true,    // Xác thực chữ ký của token
        ValidIssuer = jwtSettings["Issuer"],           // Issuer hợp lệ
        ValidAudience = jwtSettings["Audience"],        // Audience hợp lệ
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)), // Key để verify chữ ký
        ClockSkew = TimeSpan.Zero           // Không cho phép sai lệch thời gian (0 giây)
    };
});

// Đăng ký authorization service
builder.Services.AddAuthorization();

// Đăng ký Infrastructure Services (Singleton - chỉ tạo một instance duy nhất trong suốt vòng đời ứng dụng)
// RabbitMQ Service: Xử lý message queue để publish/subscribe events
builder.Services.AddSingleton<IRabbitMQService, RabbitMQService>();
// Redis Service: Cache service để lưu trữ dữ liệu tạm thời với hiệu suất cao
builder.Services.AddSingleton<IRedisService, RedisService>();
// MongoDB Service: NoSQL database service để lưu trữ dữ liệu không cấu trúc
builder.Services.AddSingleton<IMongoDbService, MongoDbService>();

// QR Code Service (Scoped - tạo mới mỗi request)
// Service để tạo và validate QR code cho booking
builder.Services.AddScoped<IQrCodeService, QrCodeService>();

// AI Service với HttpClient (để gọi API của AI service)
// Service này giao tiếp với AI service để xử lý các tác vụ liên quan đến AI
builder.Services.AddHttpClient<IAiService, AiService>();

// Đăng ký Repositories (Scoped - tạo mới mỗi request)
// Repository pattern để truy cập dữ liệu từ database
builder.Services.AddScoped<IBookingRepository, BookingRepository>();      // Repository cho Booking
builder.Services.AddScoped<IVehicleRepository, VehicleRepository>();     // Repository cho Vehicle
builder.Services.AddScoped<ICoOwnerRepository, CoOwnerRepository>();      // Repository cho CoOwner

// Đăng ký Business Services (Scoped)
// Service chính xử lý business logic cho booking
builder.Services.AddScoped<IBookingService, BookingServiceImpl>();

// Cấu hình CORS (Cross-Origin Resource Sharing)
// Cho phép tất cả các origin, method và header để frontend có thể gọi API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy
            .AllowAnyOrigin()      // Cho phép mọi origin
            .AllowAnyMethod()      // Cho phép mọi HTTP method (GET, POST, PUT, DELETE, etc.)
            .AllowAnyHeader());    // Cho phép mọi header
});

// Cấu hình Swagger/OpenAPI
// Thêm endpoint explorer để Swagger có thể khám phá các endpoints
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // Tạo Swagger document với thông tin API
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Booking Service API",
        Version = "v1",
        Description = "Microservice for booking management in EV Co-ownership system"
    });
});

// Build ứng dụng từ builder
var app = builder.Build();

// Cấu hình HTTP request pipeline
// Pipeline xử lý các request theo thứ tự từ trên xuống dưới
if (app.Environment.IsDevelopment())
{
    // Chỉ bật Swagger UI trong môi trường Development
    app.UseSwagger();      // Middleware để serve Swagger JSON
    app.UseSwaggerUI();    // Middleware để serve Swagger UI (giao diện web)
}

// Áp dụng CORS policy
app.UseCors("AllowAll");
// Chuyển hướng HTTP sang HTTPS
app.UseHttpsRedirection();
// Middleware xác thực người dùng (phải đặt trước UseAuthorization)
app.UseAuthentication();
// Middleware phân quyền người dùng
app.UseAuthorization();
// Map các controllers vào routing
app.MapControllers();

// Áp dụng database migrations khi khởi động ứng dụng
// Tự động chạy migrations nếu có thay đổi trong database schema
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
        // Chạy migrations tự động
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        // Log lỗi nếu migration thất bại nhưng không dừng ứng dụng
        var loggerInit = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        loggerInit.LogError(ex, "Error migrating Booking database");
    }
}

// Khởi tạo services và log thông tin khởi động
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("Booking Service started with RabbitMQ, Redis, and MongoDB integration");

// Chạy ứng dụng
app.Run();
