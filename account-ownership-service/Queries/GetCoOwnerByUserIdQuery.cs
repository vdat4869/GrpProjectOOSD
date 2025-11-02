using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Queries;

public class GetCoOwnerByUserIdQuery : IRequest<CoOwnerDto?>
{
    public string UserId { get; set; } = string.Empty;

    public GetCoOwnerByUserIdQuery(string userId)
    {
        UserId = userId;
    }
}

