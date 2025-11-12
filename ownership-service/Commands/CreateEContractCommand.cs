using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Commands;

public class CreateEContractCommand : IRequest<EContractDto>
{
    public CreateEContractDto Dto { get; set; } = null!;

    public CreateEContractCommand(CreateEContractDto dto)
    {
        Dto = dto;
    }
}

