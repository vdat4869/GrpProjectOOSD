using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Commands;

public class CreateOwnershipCommand : IRequest<OwnershipDto>
{
    public CreateOwnershipDto Dto { get; set; } = null!;

    public CreateOwnershipCommand(CreateOwnershipDto dto)
    {
        Dto = dto;
    }
}

