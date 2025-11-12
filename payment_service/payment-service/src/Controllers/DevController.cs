using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.Models;
using PaymentService.DTOs;
using PaymentService.Services;

namespace PaymentService.Controllers;

[ApiController]
[Route("api/dev")]
[AllowAnonymous]
public class DevController : ControllerBase
{
    private static readonly Guid DevGroupId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid DevVehicleId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly Guid DevUser1Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static readonly Guid DevUser2Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");

    private readonly PaymentDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly CostSharingService _costSharingService;
    private readonly PaymentGatewayService _paymentGatewayService;

    public DevController(
        PaymentDbContext context,
        IWebHostEnvironment env,
        CostSharingService costSharingService,
        PaymentGatewayService paymentGatewayService)
    {
        _context = context;
        _env = env;
        _costSharingService = costSharingService;
        _paymentGatewayService = paymentGatewayService;
    }

    [HttpGet("seed")]
    public async Task<ActionResult<object>> Seed()
    {
        if (!_env.IsDevelopment()) return Forbid();
        var seed = await EnsureDevDataAsync();
        return Ok(new
        {
            walletId = seed.wallet.Id,
            costShareId = seed.costShare.Id,
            costShareDetailId = seed.detail.Id,
            groupId = seed.costShare.GroupId
        });
    }

    [HttpGet("costshares/suggest")]
    public async Task<ActionResult<object>> GetSuggestion([FromQuery] decimal? totalCost, [FromQuery] string? costType)
    {
        if (!_env.IsDevelopment()) return Forbid();
        var seed = await EnsureDevDataAsync();

        var request = new GetCostSharingSuggestionRequest
        {
            GroupId = seed.costShare.GroupId,
            TotalCost = totalCost ?? 250000m,
            CostType = costType ?? "maintenance"
        };

        var suggestions = await _costSharingService.GetCostSharingSuggestionAsync(request);
        if (suggestions == null || suggestions.Count == 0)
        {
            suggestions = seed.costShare.CostShareDetails
                .Where(d => !d.IsDeleted)
                .Select(d => new CostSharingSuggestionDto
                {
                    CoOwnerId = d.UserId.ToString(),
                    SuggestedAmount = Math.Round(request.TotalCost * (d.OwnershipPercentage / 100m), 2),
                    Reason = "Ownership-based fallback calculation",
                    Method = "ownership_based"
                })
                .ToList();
        }
        return Ok(new
        {
            request.GroupId,
            request.TotalCost,
            request.CostType,
            suggestions
        });
    }

    [HttpPost("payments/create")]
    public async Task<ActionResult<PaymentDto>> CreatePayment()
    {
        if (!_env.IsDevelopment()) return Forbid();
        var seed = await EnsureDevDataAsync();

        var dto = new CreatePaymentDto
        {
            CostShareDetailId = seed.detail.Id,
            WalletId = seed.wallet.Id,
            Method = PaymentMethodType.Banking,
            Amount = seed.detail.Amount,
            Currency = seed.detail.Currency,
            CallbackUrl = "https://dev-payment-callback.local/callback",
            ReturnUrl = "https://dev-payment-callback.local/return"
        };

        var payment = await _paymentGatewayService.CreatePaymentAsync(dto);
        return Ok(payment);
    }

    private async Task<(Wallet wallet, CostShare costShare, CostShareDetail detail)> EnsureDevDataAsync()
    {
        var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == DevUser1Id);
        if (wallet == null)
        {
            wallet = new Wallet
            {
                UserId = DevUser1Id,
                GroupId = DevGroupId,
                Balance = 1_000_000m,
                FrozenAmount = 0,
                Currency = "VND",
                IsActive = true
            };
            _context.Wallets.Add(wallet);
            await _context.SaveChangesAsync();
        }

        var costShare = await _context.CostShares
            .Include(cs => cs.CostShareDetails)
            .FirstOrDefaultAsync(cs => cs.Title == "Dev Maintenance Cost" && !cs.IsDeleted);

        if (costShare == null)
        {
            var detail1 = new CostShareDetail
            {
                Id = Guid.NewGuid(),
                UserId = DevUser1Id,
                OwnershipPercentage = 60m,
                Amount = 150000m,
                Currency = "VND",
                Status = CostShareDetailStatus.Pending
            };

            var detail2 = new CostShareDetail
            {
                Id = Guid.NewGuid(),
                UserId = DevUser2Id,
                OwnershipPercentage = 40m,
                Amount = 100000m,
                Currency = "VND",
                Status = CostShareDetailStatus.Pending
            };

            costShare = new CostShare
            {
                Id = Guid.NewGuid(),
                GroupId = DevGroupId,
                VehicleId = DevVehicleId,
                CostType = CostType.Maintenance,
                Title = "Dev Maintenance Cost",
                Description = "Auto-generated cost share for smoke testing",
                TotalAmount = detail1.Amount + detail2.Amount,
                Currency = "VND",
                DueDate = DateTime.UtcNow.AddDays(7),
                Status = CostShareStatus.Pending,
                CostShareDetails = new List<CostShareDetail> { detail1, detail2 }
            };

            _context.CostShares.Add(costShare);
            await _context.SaveChangesAsync();
        }
        else
        {
            // Ensure there are at least two active details
            if (!costShare.CostShareDetails.Any(d => d.UserId == DevUser1Id && !d.IsDeleted))
            {
                var newDetail = new CostShareDetail
                {
                    Id = Guid.NewGuid(),
                    CostShareId = costShare.Id,
                    UserId = DevUser1Id,
                    OwnershipPercentage = 60m,
                    Amount = 150000m,
                    Currency = "VND",
                    Status = CostShareDetailStatus.Pending
                };
                _context.CostShareDetails.Add(newDetail);
                costShare.CostShareDetails.Add(newDetail);
                await _context.SaveChangesAsync();
            }
            if (!costShare.CostShareDetails.Any(d => d.UserId == DevUser2Id && !d.IsDeleted))
            {
                var newDetail = new CostShareDetail
                {
                    Id = Guid.NewGuid(),
                    CostShareId = costShare.Id,
                    UserId = DevUser2Id,
                    OwnershipPercentage = 40m,
                    Amount = 100000m,
                    Currency = "VND",
                    Status = CostShareDetailStatus.Pending
                };
                _context.CostShareDetails.Add(newDetail);
                costShare.CostShareDetails.Add(newDetail);
                await _context.SaveChangesAsync();
            }
        }

        var detail = costShare.CostShareDetails
            .First(d => d.UserId == DevUser1Id && !d.IsDeleted);

        return (wallet, costShare, detail);
    }
}


