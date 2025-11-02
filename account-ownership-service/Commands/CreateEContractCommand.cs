using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Commands;

public class CreateEContractCommand : IRequest<EContractDto>
{
    public CreateEContractDto Dto { get; set; } = null!;

    public CreateEContractCommand(CreateEContractDto dto)
    {
        Dto = dto;
    }
}

