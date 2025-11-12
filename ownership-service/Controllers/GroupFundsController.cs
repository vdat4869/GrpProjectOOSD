using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OwnershipService.DTOs;
using OwnershipService.Data;
using OwnershipService.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace OwnershipService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupFundsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GroupFundsController> _logger;

    public GroupFundsController(ApplicationDbContext context, ILogger<GroupFundsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all funds for a vehicle group
    /// </summary>
    [HttpGet("vehicle-group/{groupId}")]
    public async Task<ActionResult<List<GroupFundDto>>> GetGroupFunds(Guid groupId)
    {
        var funds = await _context.GroupFunds
            .Include(f => f.Transactions)
            .Where(f => f.VehicleGroupId == groupId)
            .ToListAsync();

        var result = funds.Select(f => new GroupFundDto
        {
            Id = f.Id,
            VehicleGroupId = f.VehicleGroupId,
            Name = f.Name,
            Description = f.Description,
            Balance = f.Balance,
            Currency = f.Currency,
            Status = f.Status.ToString(),
            CreatedAt = f.CreatedAt,
            UpdatedAt = f.UpdatedAt,
            TransactionCount = f.Transactions.Count
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Create a new group fund
    /// </summary>
    [HttpPost("vehicle-group/{groupId}")]
    public async Task<ActionResult<GroupFundDto>> CreateGroupFund(Guid groupId, [FromBody] CreateGroupFundDto dto)
    {
        var group = await _context.VehicleGroups.FindAsync(groupId);
        if (group == null)
            return NotFound();

        var fund = new GroupFund
        {
            VehicleGroupId = groupId,
            Name = dto.Name,
            Description = dto.Description,
            Currency = dto.Currency,
            Balance = 0,
            Status = FundStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.GroupFunds.Add(fund);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGroupFunds), new { groupId }, new GroupFundDto
        {
            Id = fund.Id,
            VehicleGroupId = fund.VehicleGroupId,
            Name = fund.Name,
            Description = fund.Description,
            Balance = fund.Balance,
            Currency = fund.Currency,
            Status = fund.Status.ToString(),
            CreatedAt = fund.CreatedAt,
            UpdatedAt = fund.UpdatedAt,
            TransactionCount = 0
        });
    }

    /// <summary>
    /// Get fund transactions
    /// </summary>
    [HttpGet("{fundId}/transactions")]
    public async Task<ActionResult<List<FundTransactionDto>>> GetFundTransactions(Guid fundId, [FromQuery] string? type = null)
    {
        var query = _context.FundTransactions
            .Include(t => t.CoOwner)
            .Where(t => t.GroupFundId == fundId)
            .AsQueryable();

        if (!string.IsNullOrEmpty(type) && Enum.TryParse<TransactionType>(type, true, out var typeEnum))
        {
            query = query.Where(t => t.Type == typeEnum);
        }

        var transactions = await query.OrderByDescending(t => t.TransactionDate).ToListAsync();

        var result = transactions.Select(t => new FundTransactionDto
        {
            Id = t.Id,
            GroupFundId = t.GroupFundId,
            CoOwnerId = t.CoOwnerId,
            CoOwnerName = t.CoOwner?.FullName ?? "",
            Type = t.Type.ToString(),
            Amount = t.Amount,
            Currency = t.Currency,
            Description = t.Description,
            Category = t.Category,
            ReceiptNumber = t.ReceiptNumber,
            ReceiptImageUrl = t.ReceiptImageUrl,
            Status = t.Status.ToString(),
            ApprovedByCoOwnerId = t.ApprovedByCoOwnerId,
            ApprovedAt = t.ApprovedAt,
            TransactionDate = t.TransactionDate,
            CreatedAt = t.CreatedAt
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Create fund transaction (contribution or expense)
    /// </summary>
    [HttpPost("{fundId}/transactions")]
    public async Task<ActionResult<FundTransactionDto>> CreateFundTransaction(Guid fundId, [FromBody] CreateFundTransactionDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var coOwner = await _context.CoOwners.FirstOrDefaultAsync(c => c.UserId == userId);
        if (coOwner == null)
            return BadRequest(new { message = "Co-owner not found" });

        var fund = await _context.GroupFunds.FindAsync(fundId);
        if (fund == null)
            return NotFound();

        if (!Enum.TryParse<TransactionType>(dto.Type, true, out var transactionType))
            return BadRequest(new { message = "Invalid transaction type" });

        var transaction = new FundTransaction
        {
            GroupFundId = fundId,
            CoOwnerId = coOwner.Id,
            Type = transactionType,
            Amount = dto.Amount,
            Currency = fund.Currency,
            Description = dto.Description,
            Category = dto.Category,
            ReceiptNumber = dto.ReceiptNumber,
            ReceiptImageUrl = dto.ReceiptImageUrl,
            Status = TransactionStatus.Pending,
            TransactionDate = dto.TransactionDate ?? DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.FundTransactions.Add(transaction);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetFundTransactions), new { fundId }, new FundTransactionDto
        {
            Id = transaction.Id,
            GroupFundId = transaction.GroupFundId,
            CoOwnerId = transaction.CoOwnerId,
            CoOwnerName = coOwner.FullName,
            Type = transaction.Type.ToString(),
            Amount = transaction.Amount,
            Currency = transaction.Currency,
            Description = transaction.Description,
            Category = transaction.Category,
            ReceiptNumber = transaction.ReceiptNumber,
            ReceiptImageUrl = transaction.ReceiptImageUrl,
            Status = transaction.Status.ToString(),
            TransactionDate = transaction.TransactionDate,
            CreatedAt = transaction.CreatedAt
        });
    }

    /// <summary>
    /// Approve fund transaction (for expenses, requires approval)
    /// </summary>
    [HttpPost("transactions/{transactionId}/approve")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<FundTransactionDto>> ApproveFundTransaction(Guid transactionId, [FromBody] ApproveFundTransactionDto? dto = null)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var approver = await _context.CoOwners.FirstOrDefaultAsync(c => c.UserId == userId);
        if (approver == null)
            return BadRequest(new { message = "Co-owner not found" });

        var transaction = await _context.FundTransactions
            .Include(t => t.GroupFund)
            .Include(t => t.CoOwner)
            .FirstOrDefaultAsync(t => t.Id == transactionId);
        if (transaction == null)
            return NotFound();

        if (transaction.Status != TransactionStatus.Pending)
            return BadRequest(new { message = "Transaction already processed" });

        transaction.Status = TransactionStatus.Approved;
        transaction.ApprovedByCoOwnerId = approver.Id;
        transaction.ApprovedAt = DateTime.UtcNow;
        transaction.UpdatedAt = DateTime.UtcNow;

        // Update fund balance
        if (transaction.Type == TransactionType.Contribution)
        {
            transaction.GroupFund!.Balance += transaction.Amount;
        }
        else if (transaction.Type == TransactionType.Expense)
        {
            transaction.GroupFund!.Balance -= transaction.Amount;
        }

        transaction.GroupFund!.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new FundTransactionDto
        {
            Id = transaction.Id,
            GroupFundId = transaction.GroupFundId,
            CoOwnerId = transaction.CoOwnerId,
            CoOwnerName = transaction.CoOwner?.FullName ?? "",
            Type = transaction.Type.ToString(),
            Amount = transaction.Amount,
            Currency = transaction.Currency,
            Description = transaction.Description,
            Category = transaction.Category,
            ReceiptNumber = transaction.ReceiptNumber,
            ReceiptImageUrl = transaction.ReceiptImageUrl,
            Status = transaction.Status.ToString(),
            ApprovedByCoOwnerId = transaction.ApprovedByCoOwnerId,
            ApprovedAt = transaction.ApprovedAt,
            TransactionDate = transaction.TransactionDate,
            CreatedAt = transaction.CreatedAt
        });
    }
}

