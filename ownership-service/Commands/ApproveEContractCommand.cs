using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Commands;

public class ApproveEContractCommand : IRequest<EContractDto>
{
    public Guid Id { get; set; }
    public string? Notes { get; set; }

    public ApproveEContractCommand(Guid id, string? notes = null)
    {
        Id = id;
        Notes = notes;
    }
}

