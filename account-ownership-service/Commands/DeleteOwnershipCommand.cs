using MediatR;

namespace AccountOwnershipService.Commands;

public class DeleteOwnershipCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public DeleteOwnershipCommand(Guid id)
    {
        Id = id;
    }
}

