using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Commands;

public class UpdateEContractCommand : IRequest<EContractDto>
{
    public Guid Id { get; set; }
    public UpdateEContractDto Dto { get; set; } = null!;

    public UpdateEContractCommand(Guid id, UpdateEContractDto dto)
    {
        Id = id;
        Dto = dto;
    }
}

