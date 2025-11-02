using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Commands;

public class UpdateCoOwnerCommand : IRequest<CoOwnerDto>
{
    public Guid Id { get; set; }
    public UpdateCoOwnerDto Dto { get; set; } = null!;

    public UpdateCoOwnerCommand(Guid id, UpdateCoOwnerDto dto)
    {
        Id = id;
        Dto = dto;
    }
}

