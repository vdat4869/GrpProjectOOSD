using GroupManagementService.Data;
using GroupManagementService.Models;
using Microsoft.EntityFrameworkCore;

namespace GroupManagementService.Repositories
{
    public class UsageRepository : IUsageRepository
    {
        private readonly AppDbContext _context;
        public UsageRepository(AppDbContext context) => _context = context;

        public async Task AddAsync(VehicleUsage usage)
        {
            _context.VehicleUsages.Add(usage);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<VehicleUsage>> GetByGroupAsync(int groupId) =>
            await _context.VehicleUsages.Where(u => u.GroupId == groupId)
                .OrderByDescending(u => u.Date)
                .ToListAsync();

        public async Task SaveChangesAsync() => await _context.SaveChangesAsync();
    }
}


