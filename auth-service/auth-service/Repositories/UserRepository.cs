using AuthService.Models;
using AuthService.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Repositories;

/// <summary>
/// Repository interface cho User operations
/// Định nghĩa các phương thức truy cập dữ liệu User
/// </summary>
public interface IUserRepository
{
    /// <summary>Lấy user theo email</summary>
    Task<User?> GetByEmailAsync(string email);
    
    /// <summary>Lấy user theo ID</summary>
    Task<User?> GetByIdAsync(int id);
    
    /// <summary>Tạo user mới</summary>
    Task<User> CreateAsync(User user);
    
    /// <summary>Cập nhật user</summary>
    Task<User> UpdateAsync(User user);
    
    /// <summary>Xóa user (soft delete - set IsActive = false)</summary>
    Task<bool> DeleteAsync(int id);
    
    /// <summary>Kiểm tra email đã tồn tại chưa</summary>
    Task<bool> EmailExistsAsync(string email);
    
    /// <summary>Lấy tất cả users đang active</summary>
    Task<List<User>> GetAllAsync();
    
    /// <summary>Lấy users theo role</summary>
    Task<List<User>> GetByRoleAsync(string roleName);
}

/// <summary>
/// Repository implementation cho User operations
/// Thực hiện các thao tác CRUD với User entity
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly AuthDbContext _context;

    /// <summary>
    /// Constructor - Dependency Injection
    /// </summary>
    public UserRepository(AuthDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy user theo email
    /// Include UserRoles và Role để load đầy đủ thông tin roles
    /// </summary>
    /// <param name="email">Email của user</param>
    /// <returns>User entity hoặc null nếu không tìm thấy</returns>
    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users
            .Include(u => u.UserRoles) // Load UserRoles
                .ThenInclude(ur => ur.Role) // Load Role của mỗi UserRole
            .FirstOrDefaultAsync(u => u.Email == email);
    }

    /// <summary>
    /// Lấy user theo ID
    /// Include UserRoles và Role để load đầy đủ thông tin roles
    /// </summary>
    /// <param name="id">ID của user</param>
    /// <returns>User entity hoặc null nếu không tìm thấy</returns>
    public async Task<User?> GetByIdAsync(int id)
    {
        return await _context.Users
            .Include(u => u.UserRoles) // Load UserRoles
                .ThenInclude(ur => ur.Role) // Load Role của mỗi UserRole
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    /// <summary>
    /// Tạo user mới
    /// Tự động set CreatedAt, UpdatedAt, IsActive = true
    /// </summary>
    /// <param name="user">User entity cần tạo</param>
    /// <returns>User entity đã được lưu (có ID)</returns>
    public async Task<User> CreateAsync(User user)
    {
        // Set timestamps
        user.CreatedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        user.IsActive = true; // Mặc định active

        // Thêm vào context và lưu
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    /// <summary>
    /// Cập nhật user
    /// Tự động set UpdatedAt
    /// </summary>
    /// <param name="user">User entity cần cập nhật</param>
    /// <returns>User entity đã được cập nhật</returns>
    public async Task<User> UpdateAsync(User user)
    {
        // Cập nhật timestamp
        user.UpdatedAt = DateTime.UtcNow;
        
        // Mark entity as modified và lưu
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
        return user;
    }

    /// <summary>
    /// Xóa user (soft delete)
    /// Không xóa thực sự, chỉ set IsActive = false
    /// </summary>
    /// <param name="id">ID của user cần xóa</param>
    /// <returns>true nếu xóa thành công, false nếu không tìm thấy user</returns>
    public async Task<bool> DeleteAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        // Soft delete: set IsActive = false
        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Kiểm tra email đã tồn tại chưa
    /// </summary>
    public async Task<bool> EmailExistsAsync(string email)
    {
        return await _context.Users.AnyAsync(u => u.Email == email);
    }

    /// <summary>
    /// Lấy tất cả users
    /// </summary>
    public async Task<List<User>> GetAllAsync()
    {
        return await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Where(u => u.IsActive)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy users theo role
    /// </summary>
    public async Task<List<User>> GetByRoleAsync(string roleName)
    {
        return await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Where(u => u.IsActive && u.UserRoles.Any(ur => ur.Role.Name == roleName))
            .ToListAsync();
    }
}
