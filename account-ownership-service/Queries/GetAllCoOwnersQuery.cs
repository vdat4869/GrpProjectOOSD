using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Queries;

public class GetAllCoOwnersQuery : IRequest<List<CoOwnerDto>>
{
    public bool? IsVerified { get; set; }

    public GetAllCoOwnersQuery(bool? isVerified = null)
    {
        IsVerified = isVerified;
    }
}

