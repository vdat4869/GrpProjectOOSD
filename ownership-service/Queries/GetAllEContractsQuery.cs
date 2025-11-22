using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Queries;

public class GetAllEContractsQuery : IRequest<List<EContractDto>>
{
    public string? Status { get; set; }
    public Guid? VehicleGroupId { get; set; }
    public Guid? CoOwnerId { get; set; }

    public GetAllEContractsQuery(string? status = null, Guid? vehicleGroupId = null, Guid? coOwnerId = null)
    {
        Status = status;
        VehicleGroupId = vehicleGroupId;
        CoOwnerId = coOwnerId;
    }
}

