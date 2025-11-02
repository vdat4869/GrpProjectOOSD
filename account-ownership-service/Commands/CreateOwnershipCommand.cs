using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Commands;

public class CreateOwnershipCommand : IRequest<OwnershipDto>
{
    public CreateOwnershipDto Dto { get; set; } = null!;

    public CreateOwnershipCommand(CreateOwnershipDto dto)
    {
        Dto = dto;
    }
}

