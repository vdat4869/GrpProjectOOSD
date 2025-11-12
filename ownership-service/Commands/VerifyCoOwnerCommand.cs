using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Commands;

public class VerifyCoOwnerCommand : IRequest<CoOwnerDto>
{
    public Guid Id { get; set; }

    public VerifyCoOwnerCommand(Guid id)
    {
        Id = id;
    }
}

