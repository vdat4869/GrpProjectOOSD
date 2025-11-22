using MediatR;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using OwnershipService.Data;
using OwnershipService.Models;
using OwnershipService.DTOs;
using OwnershipService.Commands;
using OwnershipService.Queries;

namespace OwnershipService.Handlers;

public class CreateCoOwnerHandler : IRequestHandler<CreateCoOwnerCommand, CoOwnerDto>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public CreateCoOwnerHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<CoOwnerDto> Handle(CreateCoOwnerCommand request, CancellationToken cancellationToken)
    {
        // Check if user already exists
        var existingCoOwner = await _context.CoOwners
            .FirstOrDefaultAsync(c => c.UserId == request.Dto.UserId || 
                                     c.Email == request.Dto.Email ||
                                     c.IdentityCardNumber == request.Dto.IdentityCardNumber, 
                                     cancellationToken);

        if (existingCoOwner != null)
        {
            throw new InvalidOperationException("Co-owner with this UserId, Email, or Identity Card Number already exists.");
        }

        var coOwner = new CoOwner
        {
            UserId = request.Dto.UserId,
            FullName = request.Dto.FullName,
            IdentityCardNumber = request.Dto.IdentityCardNumber,
            DrivingLicenseNumber = request.Dto.DrivingLicenseNumber,
            Email = request.Dto.Email,
            PhoneNumber = request.Dto.PhoneNumber,
            Address = request.Dto.Address,
            IsVerified = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CoOwners.Add(coOwner);
        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<CoOwnerDto>(coOwner);
    }
}

public class UpdateCoOwnerHandler : IRequestHandler<UpdateCoOwnerCommand, CoOwnerDto>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public UpdateCoOwnerHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<CoOwnerDto> Handle(UpdateCoOwnerCommand request, CancellationToken cancellationToken)
    {
        var coOwner = await _context.CoOwners.FindAsync(new object[] { request.Id }, cancellationToken);

        if (coOwner == null)
        {
            throw new KeyNotFoundException($"Co-owner with ID {request.Id} not found.");
        }

        if (!string.IsNullOrEmpty(request.Dto.FullName))
            coOwner.FullName = request.Dto.FullName;
        if (!string.IsNullOrEmpty(request.Dto.DrivingLicenseNumber))
            coOwner.DrivingLicenseNumber = request.Dto.DrivingLicenseNumber;
        if (!string.IsNullOrEmpty(request.Dto.Email))
            coOwner.Email = request.Dto.Email;
        if (!string.IsNullOrEmpty(request.Dto.PhoneNumber))
            coOwner.PhoneNumber = request.Dto.PhoneNumber;
        if (!string.IsNullOrEmpty(request.Dto.Address))
            coOwner.Address = request.Dto.Address;

        coOwner.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<CoOwnerDto>(coOwner);
    }
}

public class VerifyCoOwnerHandler : IRequestHandler<VerifyCoOwnerCommand, CoOwnerDto>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public VerifyCoOwnerHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<CoOwnerDto> Handle(VerifyCoOwnerCommand request, CancellationToken cancellationToken)
    {
        var coOwner = await _context.CoOwners.FindAsync(new object[] { request.Id }, cancellationToken);

        if (coOwner == null)
        {
            throw new KeyNotFoundException($"Co-owner with ID {request.Id} not found.");
        }

        coOwner.IsVerified = true;
        coOwner.VerifiedAt = DateTime.UtcNow;
        coOwner.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<CoOwnerDto>(coOwner);
    }
}

public class GetCoOwnerByIdHandler : IRequestHandler<GetCoOwnerByIdQuery, CoOwnerDto?>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetCoOwnerByIdHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<CoOwnerDto?> Handle(GetCoOwnerByIdQuery request, CancellationToken cancellationToken)
    {
        var coOwner = await _context.CoOwners.FindAsync(new object[] { request.Id }, cancellationToken);
        return coOwner == null ? null : _mapper.Map<CoOwnerDto>(coOwner);
    }
}

public class GetCoOwnerByUserIdHandler : IRequestHandler<GetCoOwnerByUserIdQuery, CoOwnerDto?>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetCoOwnerByUserIdHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<CoOwnerDto?> Handle(GetCoOwnerByUserIdQuery request, CancellationToken cancellationToken)
    {
        var coOwner = await _context.CoOwners
            .FirstOrDefaultAsync(c => c.UserId == request.UserId, cancellationToken);
        return coOwner == null ? null : _mapper.Map<CoOwnerDto>(coOwner);
    }
}

public class GetAllCoOwnersHandler : IRequestHandler<GetAllCoOwnersQuery, List<CoOwnerDto>>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetAllCoOwnersHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<CoOwnerDto>> Handle(GetAllCoOwnersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.CoOwners.AsQueryable();

        // Log total count before filtering
        var totalCount = await _context.CoOwners.CountAsync(cancellationToken);
        Console.WriteLine($"[GetAllCoOwnersHandler] Total co-owners in database: {totalCount}");

        if (request.IsVerified.HasValue)
        {
            query = query.Where(c => c.IsVerified == request.IsVerified.Value);
            var filteredCount = await query.CountAsync(cancellationToken);
            Console.WriteLine($"[GetAllCoOwnersHandler] After IsVerified filter ({request.IsVerified.Value}): {filteredCount}");
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim();
            query = query.Where(c =>
                c.UserId.Contains(s) ||
                c.FullName.Contains(s) ||
                c.Email.Contains(s) ||
                c.IdentityCardNumber.Contains(s));
            var searchCount = await query.CountAsync(cancellationToken);
            Console.WriteLine($"[GetAllCoOwnersHandler] After Search filter ({s}): {searchCount}");
        }

        // Sắp xếp mới nhất trước
        query = query.OrderByDescending(c => c.CreatedAt);

        // Phân trang
        var skip = (request.Page - 1) * request.PageSize;
        Console.WriteLine($"[GetAllCoOwnersHandler] Pagination: page={request.Page}, pageSize={request.PageSize}, skip={skip}");
        
        var coOwners = await query.Skip(skip).Take(request.PageSize).ToListAsync(cancellationToken);
        Console.WriteLine($"[GetAllCoOwnersHandler] Returning {coOwners.Count} co-owners");
        
        return _mapper.Map<List<CoOwnerDto>>(coOwners);
    }
}

public class DeleteCoOwnerHandler : IRequestHandler<DeleteCoOwnerCommand, bool>
{
    private readonly ApplicationDbContext _context;

    public DeleteCoOwnerHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteCoOwnerCommand request, CancellationToken cancellationToken)
    {
        var coOwner = await _context.CoOwners.FindAsync(new object[] { request.Id }, cancellationToken);
        if (coOwner == null)
        {
            return false;
        }

        _context.CoOwners.Remove(coOwner);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

