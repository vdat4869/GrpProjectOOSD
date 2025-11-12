using Microsoft.EntityFrameworkCore;
using OwnershipService.Models;

namespace OwnershipService.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<CoOwner> CoOwners { get; set; }
    public DbSet<Ownership> Ownerships { get; set; }
    public DbSet<EContract> EContracts { get; set; }
    public DbSet<VehicleGroup> VehicleGroups { get; set; }
    public DbSet<GroupMember> GroupMembers { get; set; }
    public DbSet<GroupFund> GroupFunds { get; set; }
    public DbSet<FundTransaction> FundTransactions { get; set; }
    public DbSet<Proposal> Proposals { get; set; }
    public DbSet<Vote> Votes { get; set; }

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

        // VehicleGroup configuration
        modelBuilder.Entity<VehicleGroup>(entity =>
        {
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.Status);
        });

        // GroupMember configuration
        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.HasIndex(e => new { e.VehicleGroupId, e.CoOwnerId, e.Status });
            entity.HasIndex(e => e.Status);

            entity.HasOne(gm => gm.VehicleGroup)
                  .WithMany(vg => vg.Members)
                  .HasForeignKey(gm => gm.VehicleGroupId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(gm => gm.CoOwner)
                  .WithMany()
                  .HasForeignKey(gm => gm.CoOwnerId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // GroupFund configuration
        modelBuilder.Entity<GroupFund>(entity =>
        {
            entity.HasIndex(e => e.VehicleGroupId);
            entity.HasIndex(e => e.Status);

            entity.HasOne(gf => gf.VehicleGroup)
                  .WithMany(vg => vg.Funds)
                  .HasForeignKey(gf => gf.VehicleGroupId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // FundTransaction configuration
        modelBuilder.Entity<FundTransaction>(entity =>
        {
            entity.HasIndex(e => e.GroupFundId);
            entity.HasIndex(e => e.CoOwnerId);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.TransactionDate);

            entity.HasOne(ft => ft.GroupFund)
                  .WithMany(gf => gf.Transactions)
                  .HasForeignKey(ft => ft.GroupFundId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(ft => ft.CoOwner)
                  .WithMany()
                  .HasForeignKey(ft => ft.CoOwnerId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Proposal configuration
        modelBuilder.Entity<Proposal>(entity =>
        {
            entity.HasIndex(e => e.VehicleGroupId);
            entity.HasIndex(e => e.CreatedByCoOwnerId);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Status);

            entity.HasOne(p => p.VehicleGroup)
                  .WithMany(vg => vg.Proposals)
                  .HasForeignKey(p => p.VehicleGroupId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.CreatedByCoOwner)
                  .WithMany()
                  .HasForeignKey(p => p.CreatedByCoOwnerId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Vote configuration
        modelBuilder.Entity<Vote>(entity =>
        {
            entity.HasIndex(e => new { e.ProposalId, e.CoOwnerId }).IsUnique();
            entity.HasIndex(e => e.ProposalId);
            entity.HasIndex(e => e.CoOwnerId);

            entity.HasOne(v => v.Proposal)
                  .WithMany(p => p.Votes)
                  .HasForeignKey(v => v.ProposalId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(v => v.CoOwner)
                  .WithMany()
                  .HasForeignKey(v => v.CoOwnerId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}

