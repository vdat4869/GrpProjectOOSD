using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Queries;

public class GetOwnershipsByCoOwnerQuery : IRequest<List<OwnershipDto>>
{
    public Guid CoOwnerId { get; set; }
    public bool? IsActive { get; set; }

    public GetOwnershipsByCoOwnerQuery(Guid coOwnerId, bool? isActive = null)
    {
        CoOwnerId = coOwnerId;
        IsActive = isActive;
    }
}

