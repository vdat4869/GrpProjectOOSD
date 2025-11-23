using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.Models;
using PaymentService.Repositories.Interfaces;

namespace PaymentService.Repositories
{
    public class CostShareRepository : Repository<CostShare>, ICostShareRepository
    {
        public CostShareRepository(PaymentDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<CostShare>> GetByGroupIdAsync(Guid groupId, int page = 1, int pageSize = 20)
        {
            return await _dbSet
                .Where(cs => cs.GroupId == groupId)
                .Include(cs => cs.CostShareDetails)
                .OrderByDescending(cs => cs.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<CostShare>> GetByVehicleIdAsync(Guid vehicleId, int page = 1, int pageSize = 20)
        {
            return await _dbSet
                .Where(cs => cs.VehicleId == vehicleId)
                .Include(cs => cs.CostShareDetails)
                .OrderByDescending(cs => cs.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<CostShare>> GetByStatusAsync(CostShareStatus status, int page = 1, int pageSize = 20)
        {
            return await _dbSet
                .Where(cs => cs.Status == status)
                .Include(cs => cs.CostShareDetails)
                .OrderByDescending(cs => cs.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<CostShare?> GetWithDetailsAsync(Guid id)
        {
            return await _dbSet
                .Include(cs => cs.CostShareDetails)
                .FirstOrDefaultAsync(cs => cs.Id == id);
        }

        public async Task<bool> MarkAsPaidAsync(Guid costShareDetailId)
        {
            var costShareDetail = await _context.CostShareDetails
                .FirstOrDefaultAsync(csd => csd.Id == costShareDetailId);

            if (costShareDetail == null) return false;

            costShareDetail.Status = CostShareDetailStatus.Paid;
            costShareDetail.PaidDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Check if all details are paid, then mark the main cost share as paid
            var costShare = await GetWithDetailsAsync(costShareDetail.CostShareId);
            if (costShare != null && costShare.CostShareDetails.All(csd => csd.Status == CostShareDetailStatus.Paid))
            {
                costShare.Status = CostShareStatus.Paid;
                costShare.PaidDate = DateTime.UtcNow;
                await UpdateAsync(costShare);
            }

            return true;
        }
    }
}
