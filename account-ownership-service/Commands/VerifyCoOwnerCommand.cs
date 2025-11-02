using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Commands;

public class VerifyCoOwnerCommand : IRequest<CoOwnerDto>
{
    public Guid Id { get; set; }

    public VerifyCoOwnerCommand(Guid id)
    {
        Id = id;
    }
}

