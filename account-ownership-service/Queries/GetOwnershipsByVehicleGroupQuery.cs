using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Queries;

public class GetOwnershipsByVehicleGroupQuery : IRequest<List<OwnershipDto>>
{
    public Guid VehicleGroupId { get; set; }
    public bool? IsActive { get; set; }

    public GetOwnershipsByVehicleGroupQuery(Guid vehicleGroupId, bool? isActive = null)
    {
        VehicleGroupId = vehicleGroupId;
        IsActive = isActive;
    }
}

