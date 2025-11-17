using Microsoft.EntityFrameworkCore;
using PaymentService.Models;

namespace PaymentService.Data
{
    public class PaymentDbContext : DbContext
    {
        public PaymentDbContext(DbContextOptions<PaymentDbContext> options) : base(options)
        {
        }

        // Wallets removed
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<CostShare> CostShares { get; set; }
        public DbSet<CostShareDetail> CostShareDetails { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<PaymentMethod> PaymentMethods { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Wallet configuration removed

            // Transaction configuration
            modelBuilder.Entity<Transaction>(entity =>
            {
                entity.Property(e => e.Amount).HasPrecision(18, 2);
                // Wallet relation removed
                
                entity.HasOne(e => e.RelatedTransaction)
                      .WithMany(t => t.RelatedTransactions)
                      .HasForeignKey(e => e.RelatedTransactionId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // CostShare configuration
            modelBuilder.Entity<CostShare>(entity =>
            {
                entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
                entity.HasIndex(e => new { e.GroupId, e.VehicleId });
            });

            // CostShareDetail configuration
            modelBuilder.Entity<CostShareDetail>(entity =>
            {
                entity.Property(e => e.OwnershipPercentage).HasPrecision(5, 2);
                entity.Property(e => e.Amount).HasPrecision(18, 2);
                
                entity.HasOne(e => e.CostShare)
                      .WithMany(cs => cs.CostShareDetails)
                      .HasForeignKey(e => e.CostShareId)
                      .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasIndex(e => new { e.CostShareId, e.UserId }).IsUnique();
            });

            // Payment configuration
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.Property(e => e.Amount).HasPrecision(18, 2);
                
                entity.HasOne(e => e.CostShareDetail)
                      .WithMany(csd => csd.Payments)
                      .HasForeignKey(e => e.CostShareDetailId)
                      .OnDelete(DeleteBehavior.Cascade);
                // Wallet relation removed
            });

            // PaymentMethod configuration
            modelBuilder.Entity<PaymentMethod>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.MethodType, e.AccountNumber }).IsUnique();
            });

            // Global query filters for soft delete
            modelBuilder.Entity<Transaction>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<CostShare>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<CostShareDetail>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Payment>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<PaymentMethod>().HasQueryFilter(e => !e.IsDeleted);
        }
    }
}
