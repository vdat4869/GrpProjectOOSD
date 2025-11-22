using MediatR;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using OwnershipService.Data;
using OwnershipService.DTOs;
using OwnershipService.Commands;

namespace OwnershipService.Handlers;

public class UpdateEContractHandler : IRequestHandler<UpdateEContractCommand, EContractDto>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public UpdateEContractHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<EContractDto> Handle(UpdateEContractCommand request, CancellationToken cancellationToken)
    {
        var eContract = await _context.EContracts
            .Include(ec => ec.CoOwner)
            .FirstOrDefaultAsync(ec => ec.Id == request.Id, cancellationToken);

        if (eContract == null)
        {
            throw new KeyNotFoundException($"E-Contract with ID {request.Id} not found.");
        }

        // Only allow updating contracts that are not yet signed or approved
        if (eContract.ContractStatus == "Signed" || eContract.ContractStatus == "Approved")
        {
            throw new InvalidOperationException($"Cannot update contract with status: {eContract.ContractStatus}");
        }

        // Update only provided fields
        if (!string.IsNullOrEmpty(request.Dto.ContractTitle))
        {
            eContract.ContractTitle = request.Dto.ContractTitle;
        }

        if (!string.IsNullOrEmpty(request.Dto.ContractContent))
        {
            eContract.ContractContent = request.Dto.ContractContent;
        }

        if (request.Dto.OwnershipPercentage.HasValue)
        {
            eContract.OwnershipPercentage = request.Dto.OwnershipPercentage.Value;
        }

        if (request.Dto.Notes != null)
        {
            eContract.Notes = request.Dto.Notes;
        }

        if (request.Dto.ExpiresAt.HasValue)
        {
            eContract.ExpiresAt = request.Dto.ExpiresAt.Value;
        }

        eContract.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<EContractDto>(eContract);
    }
}

