using MediatR;

namespace AccountOwnershipService.Commands;

public record DeleteCoOwnerCommand(Guid Id) : IRequest<bool>;


