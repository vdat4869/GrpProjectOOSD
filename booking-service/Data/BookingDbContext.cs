using Microsoft.EntityFrameworkCore;
using BookingService.Models;

namespace BookingService.Data
{
    public class BookingDbContext : DbContext
    {
        public BookingDbContext(DbContextOptions<BookingDbContext> options)
            : base(options)
        {
        }

        public DbSet<Booking> Bookings { get; set; }
        public DbSet<Vehicle> Vehicles { get; set; }
        public DbSet<CoOwner> CoOwners { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // === Bảng Vehicle ===
            modelBuilder.Entity<Vehicle>(entity =>
            {
                entity.HasKey(v => v.Id);
                entity.Property(v => v.Name)
                    .IsRequired()
                    .HasMaxLength(100);
                entity.Property(v => v.IsActive)
                    .IsRequired();
            });

            // === Bảng CoOwner ===
            modelBuilder.Entity<CoOwner>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Name)
                    .IsRequired()
                    .HasMaxLength(100);
                entity.Property(c => c.OwnershipRatio)
                    .HasPrecision(5, 2)
                    .IsRequired();
            });

            // === Bảng Booking ===
            modelBuilder.Entity<Booking>(entity =>
            {
                entity.HasKey(b => b.Id);
                entity.Property(b => b.StartTime)
                    .IsRequired();
                entity.Property(b => b.EndTime)
                    .IsRequired();

                entity.HasOne(b => b.Vehicle)
                    .WithMany()
                    .HasForeignKey(b => b.VehicleId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(b => b.CoOwner)
                    .WithMany()
                    .HasForeignKey(b => b.CoOwnerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            modelBuilder.Entity<Vehicle>().HasData(
                new Vehicle { Id = 1, Name = "Xe Mercedes", IsActive = true },
                new Vehicle { Id = 2, Name = "Xe VinFast", IsActive = true }
            );

            modelBuilder.Entity<CoOwner>().HasData(
                new CoOwner { Id = 1, Name = "Ngô Hoàng Thức", OwnershipRatio = 60, UsageCount = 3 },
                new CoOwner { Id = 2, Name = "Nguyễn Văn A", OwnershipRatio = 40, UsageCount = 2 }
            );

            modelBuilder.Entity<Booking>().HasData(
                new Booking
                {
                    Id = 1,
                    VehicleId = 1,
                    CoOwnerId = 1,
                    StartTime = new DateTime(2025, 11, 1, 8, 0, 0),
                    EndTime = new DateTime(2025, 11, 1, 11, 0, 0),
                    Status = "Approved",
                    Note = "Chuyến công tác"
                },
                new Booking
                {
                    Id = 2,
                    VehicleId = 2,
                    CoOwnerId = 2,
                    StartTime = new DateTime(2025, 11, 2, 9, 0, 0),
                    EndTime = new DateTime(2025, 11, 2, 13, 0, 0),
                    Status = "Pending",
                    Note = "Chờ xác nhận"
                }
            );

        }
    }
}
