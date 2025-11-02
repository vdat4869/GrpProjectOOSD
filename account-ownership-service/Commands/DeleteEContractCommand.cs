using MediatR;

namespace AccountOwnershipService.Commands;

public class DeleteEContractCommand : IRequest
{
    public Guid Id { get; set; }

    public DeleteEContractCommand(Guid id)
    {
        Id = id;
    }
}

