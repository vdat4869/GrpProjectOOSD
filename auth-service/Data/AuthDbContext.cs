using Microsoft.EntityFrameworkCore;
using AuthService.Models;

namespace AuthService.Data;

/// <summary>
/// DbContext cho Auth Service - quản lý database xác thực
/// Định nghĩa các DbSet và cấu hình Entity Framework
/// </summary>
public class AuthDbContext : DbContext
{
    /// <summary>
    /// Constructor - Nhận DbContextOptions từ DI container
    /// </summary>
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
    {
    }

    // ============================================
    // DBSET - CÁC ENTITY TRONG DATABASE
    // ============================================
    
    /// <summary>Bảng Users - lưu thông tin người dùng</summary>
    public DbSet<User> Users { get; set; }
    
    /// <summary>Bảng Roles - lưu các vai trò (Admin, Staff, CoOwner)</summary>
    public DbSet<Role> Roles { get; set; }
    
    /// <summary>Bảng UserRoles - liên kết many-to-many giữa User và Role</summary>
    public DbSet<UserRole> UserRoles { get; set; }
    
    /// <summary>Bảng IdentityDocuments - lưu CMND/CCCD/Hộ chiếu (KYC)</summary>
    public DbSet<IdentityDocument> IdentityDocuments { get; set; }
    
    /// <summary>Bảng DrivingLicenses - lưu bằng lái xe (KYC)</summary>
    public DbSet<DrivingLicense> DrivingLicenses { get; set; }
    
    /// <summary>Bảng UserSessions - lưu thông tin các session đăng nhập</summary>
    public DbSet<UserSession> UserSessions { get; set; }

    /// <summary>
    /// Cấu hình Entity Framework model
    /// Định nghĩa các ràng buộc, indexes, relationships, v.v.
    /// </summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ============================================
        // CẤU HÌNH USER ENTITY
        // ============================================
        modelBuilder.Entity<User>(entity =>
        {
            // Primary key
            entity.HasKey(e => e.Id);
            
            // Cấu hình các properties
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(255);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.IsActive).IsRequired();

            // Tạo unique index cho Email (email phải unique)
            entity.HasIndex(e => e.Email).IsUnique();
        });

        // ============================================
        // CẤU HÌNH ROLE ENTITY
        // ============================================
        modelBuilder.Entity<Role>(entity =>
        {
            // Primary key
            entity.HasKey(e => e.Id);
            
            // Cấu hình properties
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.CreatedAt).IsRequired();

            // Tạo unique index cho Name (tên role phải unique)
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // ============================================
        // CẤU HÌNH USERROLE ENTITY (MANY-TO-MANY)
        // ============================================
        modelBuilder.Entity<UserRole>(entity =>
        {
            // Composite primary key (UserId, RoleId)
            entity.HasKey(e => new { e.UserId, e.RoleId });
            
            // Relationship với User
            // Một User có nhiều UserRoles
            entity.HasOne(e => e.User)
                  .WithMany(e => e.UserRoles)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade); // Khi xóa User, xóa luôn UserRoles
                  
            // Relationship với Role
            // Một Role có nhiều UserRoles
            entity.HasOne(e => e.Role)
                  .WithMany(e => e.UserRoles)
                  .HasForeignKey(e => e.RoleId)
                  .OnDelete(DeleteBehavior.Cascade); // Khi xóa Role, xóa luôn UserRoles
        });

        // Cấu hình IdentityDocument entity
        modelBuilder.Entity<IdentityDocument>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.DocumentType).IsRequired();
            entity.Property(e => e.DocumentNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.DocumentNumber);
        });

        // Cấu hình DrivingLicense entity
        modelBuilder.Entity<DrivingLicense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.LicenseNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.LicenseClass).IsRequired().HasMaxLength(10);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.LicenseNumber);
        });

        // Cấu hình UserSession entity
        modelBuilder.Entity<UserSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.SessionToken).IsRequired().HasMaxLength(255);
            entity.Property(e => e.RefreshToken).IsRequired().HasMaxLength(255);
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.Property(e => e.LoginAt).IsRequired();
            entity.Property(e => e.ExpiresAt).IsRequired();
            entity.Property(e => e.LastActivityAt).IsRequired();
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.SessionToken).IsUnique();
            entity.HasIndex(e => e.RefreshToken);
        });

        // Seed data cho Roles
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "CoOwner", Description = "Chủ sở hữu đồng sở hữu xe", CreatedAt = DateTime.UtcNow },
            new Role { Id = 2, Name = "Staff", Description = "Nhân viên quản lý", CreatedAt = DateTime.UtcNow },
            new Role { Id = 3, Name = "Admin", Description = "Quản trị viên hệ thống", CreatedAt = DateTime.UtcNow }
        );
    }
}
