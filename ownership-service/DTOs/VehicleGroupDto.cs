namespace OwnershipService.DTOs;

public class VehicleGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string VehicleName { get; set; } = string.Empty;
    public string? LicensePlate { get; set; }
    public string? VehicleModel { get; set; }
    public string? VehicleYear { get; set; }
    public string? ImageUrl { get; set; }
    public Guid? CreatedByCoOwnerId { get; set; } // Nullable for Admin
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int MemberCount { get; set; }
    public decimal TotalFundBalance { get; set; }
}

public class CreateVehicleGroupDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string VehicleName { get; set; } = string.Empty;
    public string? LicensePlate { get; set; }
    public string? VehicleModel { get; set; }
    public string? VehicleYear { get; set; }
    public string? ImageUrl { get; set; }
}

public class UpdateVehicleGroupDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? VehicleName { get; set; }
    public string? LicensePlate { get; set; }
    public string? VehicleModel { get; set; }
    public string? VehicleYear { get; set; }
    public string? ImageUrl { get; set; }
    public string? Status { get; set; }
}

public class UpdateVehicleGroupStatusDto
{
    public string Status { get; set; } = string.Empty;
}

