namespace OwnershipService.DTOs;

public class GroupMemberDto
{
    public Guid Id { get; set; }
    public Guid VehicleGroupId { get; set; }
    public Guid CoOwnerId { get; set; }
    public string CoOwnerName { get; set; } = string.Empty;
    public string CoOwnerEmail { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public DateTime? LeftAt { get; set; }
}

public class AddGroupMemberDto
{
    public Guid CoOwnerId { get; set; }
    public string Role { get; set; } = "Member"; // Owner, Admin, Member
}

public class UpdateGroupMemberDto
{
    public string? Role { get; set; }
    public string? Status { get; set; }
}

