using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using AuthService.Data;
using AuthService.Models;
using AuthService.DTOs;
using System.Security.Claims;
using System.Linq;

namespace AuthService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class RoleController : ControllerBase
{
    private readonly AuthDbContext _db;

    public RoleController(AuthDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Lấy danh sách tất cả roles
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<RoleDto>>>> GetRoles()
    {
        var roles = await _db.Roles.ToListAsync();
        var dtos = roles.Select(r => new RoleDto
        {
            Id = r.Id,
            Name = r.Name,
            Description = r.Description,
            CreatedAt = r.CreatedAt
        }).ToList();

        return Ok(new ApiResponse<List<RoleDto>> { Success = true, Data = dtos });
    }

    /// <summary>
    /// Gán role cho user
    /// </summary>
    [HttpPost("users/{userId}/assign")]
    public async Task<ActionResult<ApiResponse<bool>>> AssignRole(int userId, [FromBody] AssignRoleRequest request)
    {
        try
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return NotFound(new ApiResponse<bool> { Success = false, Message = "Không tìm thấy user" });

            var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == request.RoleName);
            if (role == null)
                return NotFound(new ApiResponse<bool> { Success = false, Message = "Không tìm thấy role" });

            var existing = await _db.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == role.Id);

            if (existing != null)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "User đã có role này rồi" });

            var userRole = new UserRole
            {
                UserId = userId,
                RoleId = role.Id,
                AssignedAt = DateTime.UtcNow
            };

            _db.UserRoles.Add(userRole);
            await _db.SaveChangesAsync();

            return Ok(new ApiResponse<bool> { Success = true, Message = "Gán role thành công", Data = true });
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<bool> { Success = false, Message = ex.Message });
        }
    }

    /// <summary>
    /// Danh sách user + roles (kèm tìm kiếm và phân trang)
    /// </summary>
    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<PagedUsersDto>>> GetUsers([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page < 1) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var q = _db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(u => u.Email.Contains(s) || u.FirstName.Contains(s) || u.LastName.Contains(s));
        }

        var total = await q.CountAsync();
        var users = await q
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserSummaryDto
            {
                Id = u.Id,
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                IsActive = u.IsActive,
            })
            .ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();
        var rolesMap = await _db.UserRoles
            .Where(ur => userIds.Contains(ur.UserId))
            .Include(ur => ur.Role)
            .GroupBy(ur => ur.UserId)
            .ToDictionaryAsync(g => g.Key, g => g.Select(x => x.Role.Name).ToList());

        foreach (var u in users)
        {
            if (rolesMap.TryGetValue(u.Id, out var rs))
            {
                u.Roles = rs;
            }
            else
            {
                u.Roles = new List<string>();
            }
        }

        var result = new PagedUsersDto
        {
            Page = page,
            PageSize = pageSize,
            Total = total,
            Users = users
        };

        return Ok(new ApiResponse<PagedUsersDto> { Success = true, Data = result });
    }

    /// <summary>
    /// Gỡ role khỏi user
    /// </summary>
    [HttpDelete("users/{userId}/remove")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveRole(int userId, [FromBody] RemoveRoleRequest request)
    {
        try
        {
            var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == request.RoleName);
            if (role == null)
                return NotFound(new ApiResponse<bool> { Success = false, Message = "Không tìm thấy role" });

            var userRole = await _db.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == role.Id);

            if (userRole == null)
                return NotFound(new ApiResponse<bool> { Success = false, Message = "User không có role này" });

            _db.UserRoles.Remove(userRole);
            await _db.SaveChangesAsync();

            return Ok(new ApiResponse<bool> { Success = true, Message = "Gỡ role thành công", Data = true });
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<bool> { Success = false, Message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy roles của user
    /// </summary>
    [HttpGet("users/{userId}")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetUserRoles(int userId)
    {
        var roles = await _db.UserRoles
            .Where(ur => ur.UserId == userId)
            .Include(ur => ur.Role)
            .Select(ur => ur.Role.Name)
            .ToListAsync();

        return Ok(new ApiResponse<List<string>> { Success = true, Data = roles });
    }
}

/// <summary>
/// DTO cho Role
/// </summary>
public class RoleDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Request gán role
/// </summary>
public class AssignRoleRequest
{
    public string RoleName { get; set; } = string.Empty;
}

/// <summary>
/// Request gỡ role
/// </summary>
public class RemoveRoleRequest
{
    public string RoleName { get; set; } = string.Empty;
}


public class UserSummaryDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public bool IsActive { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class PagedUsersDto
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; }
    public List<UserSummaryDto> Users { get; set; } = new();
}

