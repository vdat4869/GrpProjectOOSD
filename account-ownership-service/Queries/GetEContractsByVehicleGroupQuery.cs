using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Queries;

public class GetEContractsByVehicleGroupQuery : IRequest<List<EContractDto>>
{
    public Guid VehicleGroupId { get; set; }
    public string? Status { get; set; }

    public GetEContractsByVehicleGroupQuery(Guid vehicleGroupId, string? status = null)
    {
        VehicleGroupId = vehicleGroupId;
        Status = status;
    }
}

