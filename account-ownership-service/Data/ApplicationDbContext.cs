using Microsoft.EntityFrameworkCore;
using AccountOwnershipService.Models;

namespace AccountOwnershipService.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<CoOwner> CoOwners { get; set; }
    public DbSet<Ownership> Ownerships { get; set; }
    public DbSet<EContract> EContracts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // CoOwner configuration
        modelBuilder.Entity<CoOwner>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.IdentityCardNumber).IsUnique();
            entity.HasIndex(e => e.DrivingLicenseNumber);
        });

        // Ownership configuration
        modelBuilder.Entity<Ownership>(entity =>
        {
            entity.HasIndex(e => new { e.CoOwnerId, e.VehicleGroupId, e.IsActive })
                  .HasFilter("[IsActive] = 1");

            entity.HasOne(o => o.CoOwner)
                  .WithMany(c => c.Ownerships)
                  .HasForeignKey(o => o.CoOwnerId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // EContract configuration
        modelBuilder.Entity<EContract>(entity =>
        {
            entity.HasIndex(e => new { e.CoOwnerId, e.VehicleGroupId });
            entity.HasIndex(e => e.ContractStatus);

            entity.HasOne(ec => ec.CoOwner)
                  .WithMany(c => c.EContracts)
                  .HasForeignKey(ec => ec.CoOwnerId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}

