using MediatR;
using OwnershipService.DTOs;

namespace OwnershipService.Commands;

public class UpdateOwnershipCommand : IRequest<OwnershipDto>
{
    public Guid Id { get; set; }
    public UpdateOwnershipDto Dto { get; set; } = null!;

    public UpdateOwnershipCommand(Guid id, UpdateOwnershipDto dto)
    {
        Id = id;
        Dto = dto;
    }
}

