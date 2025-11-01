using AdminService.Models;
using AdminService.Repositories;
using AdminService.Services;
using Microsoft.EntityFrameworkCore;

namespace AdminService;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Lấy connection string (ENV ưu tiên, rồi appsettings.json)
        var csFromEnv    = Environment.GetEnvironmentVariable("ConnectionStrings__Default");
        var csFromConfig = builder.Configuration.GetConnectionString("Default");
        var useSql       = !string.IsNullOrWhiteSpace(csFromEnv) || !string.IsNullOrWhiteSpace(csFromConfig);

        if (useSql)
        {
            var cs = csFromEnv ?? csFromConfig!;
            builder.Services.AddDbContext<AppDbContext>(opt => opt.UseSqlServer(cs));
            Console.WriteLine("[AdminService] Using SQL Server.");
        }
        else
        {
            builder.Services.AddDbContext<AppDbContext>(opt => opt.UseInMemoryDatabase("AdminDb"));
            Console.WriteLine("[AdminService] Using InMemory database (dev).");
        }

        builder.Services.AddScoped<IAdminRepository, AdminRepository>();
        builder.Services.AddScoped<AdminCoreService>();

        builder.Services.AddControllers().AddJsonOptions(o =>
        {
            o.JsonSerializerOptions.WriteIndented = true;
            o.JsonSerializerOptions.ReferenceHandler =
                System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        });

        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        builder.Services.AddHealthChecks();

        var app = builder.Build();

        // Seed mẫu khi dùng InMemory
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (db.Database.IsInMemory())
            {
                if (!db.ServiceOrders.Any())
                {
                    db.ServiceOrders.AddRange(
                        new ServiceOrder { Id = 1, GroupId = 1001, EstimatedCost = 500000, VendorName = "Vendor A" },
                        new ServiceOrder { Id = 2, GroupId = 1001, EstimatedCost = 800000, VendorName = "Vendor B" }
                    );
                }

                if (!db.Disputes.Any())
                {
                    db.Disputes.AddRange(
                        new Dispute { Id = 1, GroupId = 1001, Title = "Phí vệ sinh", Description = "Tranh chấp phí vệ sinh" },
                        new Dispute { Id = 2, GroupId = 1002, Title = "Lịch đặt xe", Description = "Tranh chấp lịch xe" }
                    );
                }

                db.SaveChanges();
            }
        }

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.MapHealthChecks("/health");
        app.MapControllers();
        app.Run();
    }
}
