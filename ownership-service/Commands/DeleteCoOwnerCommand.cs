using MediatR;

namespace OwnershipService.Commands;

public record DeleteCoOwnerCommand(Guid Id) : IRequest<bool>;


