using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Queries;

public class GetCoOwnerByUserIdQuery : IRequest<CoOwnerDto?>
{
    public string UserId { get; set; } = string.Empty;

    public GetCoOwnerByUserIdQuery(string userId)
    {
        UserId = userId;
    }
}

