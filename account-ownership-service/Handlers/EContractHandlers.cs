using MediatR;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using AccountOwnershipService.Data;
using AccountOwnershipService.Models;
using AccountOwnershipService.DTOs;
using AccountOwnershipService.Commands;
using AccountOwnershipService.Queries;

namespace AccountOwnershipService.Handlers;

public class CreateEContractHandler : IRequestHandler<CreateEContractCommand, EContractDto>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public CreateEContractHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<EContractDto> Handle(CreateEContractCommand request, CancellationToken cancellationToken)
    {
        var coOwner = await _context.CoOwners.FindAsync(new object[] { request.Dto.CoOwnerId }, cancellationToken);
        if (coOwner == null)
        {
            throw new KeyNotFoundException($"Co-owner with ID {request.Dto.CoOwnerId} not found.");
        }

        var eContract = _mapper.Map<EContract>(request.Dto);
        eContract.CreatedAt = DateTime.UtcNow;
        eContract.UpdatedAt = DateTime.UtcNow;

        if (!eContract.ExpiresAt.HasValue)
        {
            eContract.ExpiresAt = DateTime.UtcNow.AddMonths(6); // Default 6 months
        }

        _context.EContracts.Add(eContract);
        await _context.SaveChangesAsync(cancellationToken);

        await _context.Entry(eContract).Reference(ec => ec.CoOwner).LoadAsync(cancellationToken);

        return _mapper.Map<EContractDto>(eContract);
    }
}

public class SignEContractHandler : IRequestHandler<SignEContractCommand, EContractDto>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public SignEContractHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<EContractDto> Handle(SignEContractCommand request, CancellationToken cancellationToken)
    {
        var eContract = await _context.EContracts
            .Include(ec => ec.CoOwner)
            .FirstOrDefaultAsync(ec => ec.Id == request.Id, cancellationToken);

        if (eContract == null)
        {
            throw new KeyNotFoundException($"E-Contract with ID {request.Id} not found.");
        }

        if (eContract.ContractStatus == "Signed")
        {
            throw new InvalidOperationException("Contract is already signed.");
        }

        if (eContract.ExpiresAt.HasValue && eContract.ExpiresAt.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Contract has expired.");
        }

        eContract.ContractStatus = "Signed";
        eContract.DigitalSignature = request.DigitalSignature;
        eContract.SignedAt = DateTime.UtcNow;
        eContract.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<EContractDto>(eContract);
    }
}

public class GetEContractsByVehicleGroupHandler : IRequestHandler<GetEContractsByVehicleGroupQuery, List<EContractDto>>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetEContractsByVehicleGroupHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<EContractDto>> Handle(GetEContractsByVehicleGroupQuery request, CancellationToken cancellationToken)
    {
        var query = _context.EContracts
            .Include(ec => ec.CoOwner)
            .Where(ec => ec.VehicleGroupId == request.VehicleGroupId)
            .AsQueryable();

        if (!string.IsNullOrEmpty(request.Status))
        {
            query = query.Where(ec => ec.ContractStatus == request.Status);
        }

        var contracts = await query.ToListAsync(cancellationToken);
        return _mapper.Map<List<EContractDto>>(contracts);
    }
}

public class DeleteEContractHandler : IRequestHandler<DeleteEContractCommand>
{
    private readonly ApplicationDbContext _context;

    public DeleteEContractHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteEContractCommand request, CancellationToken cancellationToken)
    {
        var eContract = await _context.EContracts.FindAsync(new object[] { request.Id }, cancellationToken);
        
        if (eContract == null)
        {
            throw new KeyNotFoundException($"E-Contract with ID {request.Id} not found.");
        }

        _context.EContracts.Remove(eContract);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

