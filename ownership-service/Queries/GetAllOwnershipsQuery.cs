using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Queries;

public class GetAllOwnershipsQuery : IRequest<List<OwnershipDto>>
{
    public bool? IsActive { get; set; }
    public Guid? VehicleGroupId { get; set; }
    public Guid? CoOwnerId { get; set; }

    public GetAllOwnershipsQuery(bool? isActive = null, Guid? vehicleGroupId = null, Guid? coOwnerId = null)
    {
        IsActive = isActive;
        VehicleGroupId = vehicleGroupId;
        CoOwnerId = coOwnerId;
    }
}

