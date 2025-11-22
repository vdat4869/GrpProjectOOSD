using Microsoft.EntityFrameworkCore;
using BookingService.Models;

namespace BookingService.Data
{
    /// <summary>
    /// Database Context cho Booking Service
    /// Quản lý kết nối và cấu hình database cho các entities: Booking, BookingHistory, Vehicle, CoOwner
    /// Sử dụng Entity Framework Core
    /// </summary>
    public class BookingDbContext : DbContext
    {
        /// <summary>
        /// Constructor - Dependency Injection
        /// </summary>
        /// <param name="options">DbContextOptions chứa connection string và cấu hình database</param>
        public BookingDbContext(DbContextOptions<BookingDbContext> options)
            : base(options)
        {
        }

        /// <summary>
        /// DbSet cho bảng Bookings - quản lý các booking (đặt chỗ)
        /// </summary>
        public DbSet<Booking> Bookings { get; set; }
        
        /// <summary>
        /// DbSet cho bảng BookingHistories - lưu lịch sử các booking đã hoàn thành
        /// </summary>
        public DbSet<BookingHistory> BookingHistories { get; set; }
        
        /// <summary>
        /// DbSet cho bảng Vehicles - quản lý các phương tiện (xe)
        /// </summary>
        public DbSet<Vehicle> Vehicles { get; set; }
        
        /// <summary>
        /// DbSet cho bảng CoOwners - quản lý các đồng sở hữu
        /// </summary>
        public DbSet<CoOwner> CoOwners { get; set; }

        /// <summary>
        /// Cấu hình model và relationships giữa các entities
        /// Được gọi khi Entity Framework khởi tạo model
        /// </summary>
        /// <param name="modelBuilder">ModelBuilder để cấu hình entities</param>
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // === Cấu hình bảng BookingHistory ===
            modelBuilder.Entity<BookingHistory>(entity =>
            {
                // Cấu hình kiểu dữ liệu decimal cho Cost và DistanceKm
                entity.Property(e => e.Cost).HasColumnType("decimal(18,2)");
                entity.Property(e => e.DistanceKm).HasColumnType("decimal(18,2)");
            });

            // === Cấu hình bảng Vehicle ===
            modelBuilder.Entity<Vehicle>(entity =>
            {
                entity.HasKey(v => v.Id);  // Primary Key
                entity.Property(v => v.Name)
                    .IsRequired()           // Bắt buộc
                    .HasMaxLength(100);     // Tối đa 100 ký tự
                entity.Property(v => v.IsActive)
                    .IsRequired();          // Bắt buộc
            });

            // === Cấu hình bảng CoOwner ===
            modelBuilder.Entity<CoOwner>(entity =>
            {
                entity.HasKey(c => c.Id);  // Primary Key
                entity.Property(c => c.Name)
                    .IsRequired()           // Bắt buộc
                    .HasMaxLength(100);     // Tối đa 100 ký tự
                entity.Property(c => c.OwnershipRatio)
                    .HasPrecision(5, 2)     // Decimal với 5 chữ số, 2 chữ số sau dấu phẩy
                    .IsRequired();          // Bắt buộc
            });

            // === Cấu hình bảng Booking ===
            modelBuilder.Entity<Booking>(entity =>
            {
                entity.HasKey(b => b.Id);  // Primary Key
                entity.Property(b => b.StartTime)
                    .IsRequired();          // Bắt buộc
                entity.Property(b => b.EndTime)
                    .IsRequired();          // Bắt buộc

                // Relationship: Booking -> Vehicle (Many-to-One)
                // Khi xóa Vehicle, xóa luôn các Booking liên quan (Cascade)
                entity.HasOne(b => b.Vehicle)
                    .WithMany()
                    .HasForeignKey(b => b.VehicleId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Relationship: Booking -> CoOwner (Many-to-One)
                // Khi xóa CoOwner, không cho xóa nếu còn Booking liên quan (Restrict)
                entity.HasOne(b => b.CoOwner)
                    .WithMany()
                    .HasForeignKey(b => b.CoOwnerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            // === Seed Data: Dữ liệu mẫu khi khởi tạo database ===
            // Dữ liệu này sẽ được thêm vào database khi chạy migration lần đầu
            
            // Seed data cho bảng Vehicle
            modelBuilder.Entity<Vehicle>().HasData(
                new Vehicle { Id = 1, Name = "Xe Mercedes", IsActive = true },
                new Vehicle { Id = 2, Name = "Xe VinFast", IsActive = true }
            );

            // Seed data cho bảng CoOwner
            modelBuilder.Entity<CoOwner>().HasData(
                new CoOwner { Id = 1, Name = "Ngô Hoàng Thức", OwnershipRatio = 60, UsageCount = 3 },
                new CoOwner { Id = 2, Name = "Nguyễn Văn A", OwnershipRatio = 40, UsageCount = 2 }
            );

            // Seed data cho bảng Booking
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
