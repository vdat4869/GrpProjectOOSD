using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.DTOs;
using PaymentService.Models;
using PaymentService.Services.Interfaces;

namespace PaymentService.Services
{
    public interface ICostSharingService
    {
        Task<CostShareDto?> GetCostShareAsync(Guid id);
        Task<List<CostShareDto>> GetCostSharesByGroupAsync(Guid groupId, int page = 1, int pageSize = 20);
        Task<CostShareDto> CreateCostShareAsync(CreateCostShareDto dto);
        Task<CostShareDto?> UpdateCostShareAsync(Guid id, UpdateCostShareDto dto);
        Task<bool> DeleteCostShareAsync(Guid id);
        Task<List<CostShareDetailDto>> GetCostShareDetailsAsync(Guid costShareId);
        Task<bool> MarkAsPaidAsync(Guid costShareDetailId);
    }

    public class CostSharingService : ICostSharingService
    {
        private readonly PaymentDbContext _context;
        private readonly IMapper _mapper;

        public CostSharingService(PaymentDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<CostShareDto?> GetCostShareAsync(Guid id)
        {
            var costShare = await _context.CostShares
                .Include(cs => cs.CostShareDetails)
                .FirstOrDefaultAsync(cs => cs.Id == id && !cs.IsDeleted);
            
            return costShare != null ? _mapper.Map<CostShareDto>(costShare) : null;
        }

        public async Task<List<CostShareDto>> GetCostSharesByGroupAsync(Guid groupId, int page = 1, int pageSize = 20)
        {
            var costShares = await _context.CostShares
                .Include(cs => cs.CostShareDetails)
                .Where(cs => cs.GroupId == groupId && !cs.IsDeleted)
                .OrderByDescending(cs => cs.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            
            return _mapper.Map<List<CostShareDto>>(costShares);
        }

        public async Task<CostShareDto> CreateCostShareAsync(CreateCostShareDto dto)
        {
            var costShare = _mapper.Map<CostShare>(dto);
            
            // Validate that total amount matches sum of details
            var totalDetailAmount = dto.CostShareDetails.Sum(d => d.Amount);
            if (Math.Abs(totalDetailAmount - dto.TotalAmount) > 0.01m)
            {
                throw new InvalidOperationException("Total amount does not match sum of cost share details");
            }

            _context.CostShares.Add(costShare);
            await _context.SaveChangesAsync();
            
            return await GetCostShareAsync(costShare.Id) ?? throw new InvalidOperationException("Failed to create cost share");
        }

        public async Task<CostShareDto?> UpdateCostShareAsync(Guid id, UpdateCostShareDto dto)
        {
            var costShare = await _context.CostShares
                .FirstOrDefaultAsync(cs => cs.Id == id && !cs.IsDeleted);
            
            if (costShare == null) return null;

            if (!string.IsNullOrEmpty(dto.Title)) costShare.Title = dto.Title;
            if (!string.IsNullOrEmpty(dto.Description)) costShare.Description = dto.Description;
            if (dto.TotalAmount.HasValue) costShare.TotalAmount = dto.TotalAmount.Value;
            if (dto.DueDate.HasValue) costShare.DueDate = dto.DueDate.Value;
            if (!string.IsNullOrEmpty(dto.ReceiptUrl)) costShare.ReceiptUrl = dto.ReceiptUrl;
            
            costShare.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            return await GetCostShareAsync(id);
        }

        public async Task<bool> DeleteCostShareAsync(Guid id)
        {
            var costShare = await _context.CostShares
                .FirstOrDefaultAsync(cs => cs.Id == id && !cs.IsDeleted);
            
            if (costShare == null) return false;

            costShare.IsDeleted = true;
            costShare.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            return true;
        }

        public async Task<List<CostShareDetailDto>> GetCostShareDetailsAsync(Guid costShareId)
        {
            var details = await _context.CostShareDetails
                .Where(csd => csd.CostShareId == costShareId && !csd.IsDeleted)
                .OrderBy(csd => csd.CreatedAt)
                .ToListAsync();
            
            return _mapper.Map<List<CostShareDetailDto>>(details);
        }

        public async Task<bool> MarkAsPaidAsync(Guid costShareDetailId)
        {
            var detail = await _context.CostShareDetails
                .FirstOrDefaultAsync(csd => csd.Id == costShareDetailId && !csd.IsDeleted);
            
            if (detail == null) return false;

            detail.Status = CostShareDetailStatus.Paid;
            detail.PaidDate = DateTime.UtcNow;
            detail.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            // Check if all details are paid, then mark cost share as completed
            var allDetailsPaid = await _context.CostShareDetails
                .AllAsync(csd => csd.CostShareId == detail.CostShareId && 
                               (csd.Status == CostShareDetailStatus.Paid || csd.IsDeleted));
            
            if (allDetailsPaid)
            {
                var costShare = await _context.CostShares
                    .FirstOrDefaultAsync(cs => cs.Id == detail.CostShareId);
                
                if (costShare != null)
                {
                    costShare.Status = CostShareStatus.Paid;
                    costShare.PaidDate = DateTime.UtcNow;
                    costShare.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }
            
            return true;
        }
    }
}
