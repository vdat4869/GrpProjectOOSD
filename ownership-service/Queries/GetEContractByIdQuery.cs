using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Queries;

public class GetEContractByIdQuery : IRequest<EContractDto?>
{
    public Guid Id { get; set; }

    public GetEContractByIdQuery(Guid id)
    {
        Id = id;
    }
}

