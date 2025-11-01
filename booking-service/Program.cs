using BookingService.Data;
using BookingService.Repositories;
using BookingService.Services;
using Microsoft.EntityFrameworkCore;
//Server=./SQLEXPRESS;Database=BookingDB;Trusted_Connection=True;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();

// Đăng ký DbContext và sử dụng chuỗi kết nối từ appsettings.json
builder.Services.AddDbContext<BookingDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));


// --- Đăng ký Repository và Service ---
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IVehicleRepository, VehicleRepository>();
builder.Services.AddScoped<ICoOwnerRepository, CoOwnerRepository>();

builder.Services.AddScoped<IBookingService, BookingServiceImpl>();

// Thêm cấu hình CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// Thêm Swagger để test API
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseCors("AllowAll");

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
