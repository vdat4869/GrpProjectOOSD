using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Queries;

public class GetCoOwnerByIdQuery : IRequest<CoOwnerDto?>
{
    public Guid Id { get; set; }

    public GetCoOwnerByIdQuery(Guid id)
    {
        Id = id;
    }
}

