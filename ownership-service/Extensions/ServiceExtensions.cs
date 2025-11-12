using Microsoft.EntityFrameworkCore;
using OwnershipService.Data;
using OwnershipService.Services;

namespace OwnershipService.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Add JWT validation service
        services.AddScoped<IJwtValidationService, JwtValidationService>();

        return services;
    }

    public static void ApplyMigrations(this IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var services = scope.ServiceProvider;
        
        try
        {
            var context = services.GetRequiredService<ApplicationDbContext>();
            context.Database.Migrate();
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "An error occurred while applying migrations");
        }
    }
}

