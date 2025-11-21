using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Thêm cấu hình từ file appsettings.json
builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

// Đăng ký HttpClient cho proxy
builder.Services.AddHttpClient();

// Cấu hình JWT Authentication cho Gateway
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
            ClockSkew = TimeSpan.Zero // Không cho phép sai lệch thời gian
        };
    });

// Cấu hình CORS để frontend có thể gọi API
builder.Services.AddCors(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        // In development, allow all origins
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
    }
    else
    {
        // In production, restrict to specific origins
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.WithOrigins(
                    "http://localhost",
                    "http://localhost:80",
                    "http://localhost:8000",
                    "http://localhost:5173",
                    "http://frontend:5173"
                  )
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    }
    
    // Fallback policy for all origins (without credentials)
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Thêm Swagger cho Gateway
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { 
        Title = "EV Co-ownership Gateway API", 
        Version = "v1",
        Description = "API Gateway cho hệ thống đồng sở hữu xe điện"
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
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "EV Co-ownership Gateway API");
        c.RoutePrefix = "swagger";
    });
}

// Sử dụng CORS FIRST (before proxy to handle preflight requests)
app.UseCors("AllowFrontend");

// Sử dụng Simple Proxy middleware
app.UseMiddleware<SimpleProxyMiddleware>();

// Sử dụng Authentication (after proxy for routes that need auth)
app.UseAuthentication();

// Debug endpoint để kiểm tra routing
app.MapGet("/debug/routes", () => {
    return "Routes loaded";
});

// Health check endpoint
app.MapGet("/health", () => {
    Console.WriteLine("[Gateway] Health endpoint called");
    return new { Status = "Healthy", Timestamp = DateTime.UtcNow };
})
   .WithName("HealthCheck")
   .WithTags("Health");

// Test endpoint để kiểm tra middleware
app.MapGet("/test", () => {
    Console.WriteLine("[Gateway] Test endpoint called");
    return "Middleware working";
});

app.Run();
