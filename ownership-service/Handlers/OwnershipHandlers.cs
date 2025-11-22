using MediatR;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using OwnershipService.Data;
using OwnershipService.Models;
using OwnershipService.DTOs;
using OwnershipService.Commands;
using OwnershipService.Queries;
using OwnershipService.Infrastructure;

namespace OwnershipService.Handlers;

public class CreateOwnershipHandler : IRequestHandler<CreateOwnershipCommand, OwnershipDto>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IRabbitMQService? _rabbitMQService;
    private readonly ILogger<CreateOwnershipHandler>? _logger;

    public CreateOwnershipHandler(
        ApplicationDbContext context, 
        IMapper mapper,
        IRabbitMQService? rabbitMQService = null,
        ILogger<CreateOwnershipHandler>? logger = null)
    {
        _context = context;
        _mapper = mapper;
        _rabbitMQService = rabbitMQService;
        _logger = logger;
    }

    public async Task<OwnershipDto> Handle(CreateOwnershipCommand request, CancellationToken cancellationToken)
    {
        // Verify CoOwner exists
        var coOwner = await _context.CoOwners.FindAsync(new object[] { request.Dto.CoOwnerId }, cancellationToken);
        if (coOwner == null)
        {
            throw new KeyNotFoundException($"Co-owner with ID {request.Dto.CoOwnerId} not found.");
        }

        // Check total ownership percentage for the vehicle group
        var totalPercentage = await _context.Ownerships
            .Where(o => o.VehicleGroupId == request.Dto.VehicleGroupId && o.IsActive && o.EndDate == null)
            .SumAsync(o => o.OwnershipPercentage, cancellationToken);

        if (totalPercentage + request.Dto.OwnershipPercentage > 100)
        {
            throw new InvalidOperationException(
                $"Total ownership percentage would exceed 100%. Current total: {totalPercentage}%, Adding: {request.Dto.OwnershipPercentage}%");
        }

        // Check if this co-owner already has an active ownership for this vehicle group
        var existingOwnership = await _context.Ownerships
            .FirstOrDefaultAsync(o => o.CoOwnerId == request.Dto.CoOwnerId && 
                                     o.VehicleGroupId == request.Dto.VehicleGroupId && 
                                     o.IsActive && o.EndDate == null, 
                                     cancellationToken);

        if (existingOwnership != null)
        {
            throw new InvalidOperationException("This co-owner already has an active ownership for this vehicle group.");
        }

        var ownership = _mapper.Map<Ownership>(request.Dto);
        ownership.CreatedAt = DateTime.UtcNow;
        ownership.UpdatedAt = DateTime.UtcNow;

        _context.Ownerships.Add(ownership);
        await _context.SaveChangesAsync(cancellationToken);

        await _context.Entry(ownership).Reference(o => o.CoOwner).LoadAsync(cancellationToken);

        // Publish OwnershipUpdated event
        if (_rabbitMQService != null)
        {
            try
            {
                var eventData = new OwnershipUpdatedEvent
                {
                    OwnershipId = ownership.Id,
                    CoOwnerId = ownership.CoOwnerId,
                    VehicleGroupId = ownership.VehicleGroupId,
                    OwnershipPercentage = ownership.OwnershipPercentage,
                    IsActive = ownership.IsActive,
                    UpdatedAt = DateTime.UtcNow
                };
                _rabbitMQService.PublishEvent("ownership.updated", eventData);
                _logger?.LogInformation("Published OwnershipUpdated event for ownership {OwnershipId}", ownership.Id);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to publish OwnershipUpdated event for ownership {OwnershipId}", ownership.Id);
            }
        }

        return _mapper.Map<OwnershipDto>(ownership);
    }
}

public class UpdateOwnershipHandler : IRequestHandler<UpdateOwnershipCommand, OwnershipDto>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IRabbitMQService? _rabbitMQService;
    private readonly ILogger<UpdateOwnershipHandler>? _logger;

    public UpdateOwnershipHandler(
        ApplicationDbContext context, 
        IMapper mapper,
        IRabbitMQService? rabbitMQService = null,
        ILogger<UpdateOwnershipHandler>? logger = null)
    {
        _context = context;
        _mapper = mapper;
        _rabbitMQService = rabbitMQService;
        _logger = logger;
    }

    public async Task<OwnershipDto> Handle(UpdateOwnershipCommand request, CancellationToken cancellationToken)
    {
        var ownership = await _context.Ownerships
            .Include(o => o.CoOwner)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);

        if (ownership == null)
        {
            throw new KeyNotFoundException($"Ownership with ID {request.Id} not found.");
        }

        // If updating percentage, check total
        if (request.Dto.OwnershipPercentage.HasValue)
        {
            var totalPercentage = await _context.Ownerships
                .Where(o => o.VehicleGroupId == ownership.VehicleGroupId && 
                           o.IsActive && 
                           o.EndDate == null && 
                           o.Id != request.Id)
                .SumAsync(o => o.OwnershipPercentage, cancellationToken);

            if (totalPercentage + request.Dto.OwnershipPercentage.Value > 100)
            {
                throw new InvalidOperationException(
                    $"Total ownership percentage would exceed 100%. Current total: {totalPercentage}%, Updating to: {request.Dto.OwnershipPercentage.Value}%");
            }

            ownership.OwnershipPercentage = request.Dto.OwnershipPercentage.Value;
        }

        if (request.Dto.EndDate.HasValue)
            ownership.EndDate = request.Dto.EndDate;

        if (request.Dto.IsActive.HasValue)
            ownership.IsActive = request.Dto.IsActive.Value;

        if (!string.IsNullOrEmpty(request.Dto.Notes))
            ownership.Notes = request.Dto.Notes;

        ownership.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        // Publish OwnershipUpdated event
        if (_rabbitMQService != null)
        {
            try
            {
                var eventData = new OwnershipUpdatedEvent
                {
                    OwnershipId = ownership.Id,
                    CoOwnerId = ownership.CoOwnerId,
                    VehicleGroupId = ownership.VehicleGroupId,
                    OwnershipPercentage = ownership.OwnershipPercentage,
                    IsActive = ownership.IsActive,
                    UpdatedAt = DateTime.UtcNow
                };
                _rabbitMQService.PublishEvent("ownership.updated", eventData);
                _logger?.LogInformation("Published OwnershipUpdated event for ownership {OwnershipId}", ownership.Id);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to publish OwnershipUpdated event for ownership {OwnershipId}", ownership.Id);
            }
        }

        return _mapper.Map<OwnershipDto>(ownership);
    }
}

public class GetOwnershipsByVehicleGroupHandler : IRequestHandler<GetOwnershipsByVehicleGroupQuery, List<OwnershipDto>>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetOwnershipsByVehicleGroupHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<OwnershipDto>> Handle(GetOwnershipsByVehicleGroupQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Ownerships
            .Include(o => o.CoOwner)
            .Where(o => o.VehicleGroupId == request.VehicleGroupId)
            .AsQueryable();

        if (request.IsActive.HasValue)
        {
            query = query.Where(o => o.IsActive == request.IsActive.Value);
        }

        var ownerships = await query.ToListAsync(cancellationToken);
        return _mapper.Map<List<OwnershipDto>>(ownerships);
    }
}

public class GetOwnershipsByCoOwnerHandler : IRequestHandler<GetOwnershipsByCoOwnerQuery, List<OwnershipDto>>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetOwnershipsByCoOwnerHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<OwnershipDto>> Handle(GetOwnershipsByCoOwnerQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Ownerships
            .Include(o => o.CoOwner)
            .Where(o => o.CoOwnerId == request.CoOwnerId)
            .AsQueryable();

        if (request.IsActive.HasValue)
        {
            query = query.Where(o => o.IsActive == request.IsActive.Value);
        }

        var ownerships = await query.ToListAsync(cancellationToken);
        return _mapper.Map<List<OwnershipDto>>(ownerships);
    }
}

public class DeleteOwnershipHandler : IRequestHandler<DeleteOwnershipCommand, bool>
{
    private readonly ApplicationDbContext _context;

    public DeleteOwnershipHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteOwnershipCommand request, CancellationToken cancellationToken)
    {
        var ownership = await _context.Ownerships
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);

        if (ownership == null)
        {
            throw new KeyNotFoundException($"Ownership with ID {request.Id} not found.");
        }

        _context.Ownerships.Remove(ownership);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}

public class GetAllOwnershipsHandler : IRequestHandler<GetAllOwnershipsQuery, List<OwnershipDto>>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetAllOwnershipsHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<OwnershipDto>> Handle(GetAllOwnershipsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Ownerships
            .Include(o => o.CoOwner)
            .AsQueryable();

        if (request.IsActive.HasValue)
        {
            query = query.Where(o => o.IsActive == request.IsActive.Value);
        }

        if (request.VehicleGroupId.HasValue)
        {
            query = query.Where(o => o.VehicleGroupId == request.VehicleGroupId.Value);
        }

        if (request.CoOwnerId.HasValue)
        {
            query = query.Where(o => o.CoOwnerId == request.CoOwnerId.Value);
        }

        query = query.OrderByDescending(o => o.CreatedAt);

        var ownerships = await query.ToListAsync(cancellationToken);
        return _mapper.Map<List<OwnershipDto>>(ownerships);
    }
}

