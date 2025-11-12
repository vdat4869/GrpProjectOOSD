using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Commands;

public class CreateCoOwnerCommand : IRequest<CoOwnerDto>
{
    public CreateCoOwnerDto Dto { get; set; } = null!;

    public CreateCoOwnerCommand(CreateCoOwnerDto dto)
    {
        Dto = dto;
    }
}

