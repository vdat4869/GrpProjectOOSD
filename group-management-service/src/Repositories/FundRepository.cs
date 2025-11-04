using GroupManagementService.Data;
using GroupManagementService.Models;
using Microsoft.EntityFrameworkCore;

namespace GroupManagementService.Repositories
{
    public class FundRepository : IFundRepository
    {
        private readonly AppDbContext _context;
        public FundRepository(AppDbContext context) => _context = context;

        public async Task<Fund?> GetByIdAsync(int id) =>
            await _context.Funds.Include(f => f.Transactions).FirstOrDefaultAsync(f => f.Id == id);

        public async Task<Fund> CreateAsync(Fund fund)
        {
            _context.Funds.Add(fund);
            await _context.SaveChangesAsync();
            return fund;
        }

        public async Task<IEnumerable<Fund>> GetByGroupIdAsync(int groupId) =>
            await _context.Funds.Include(f => f.Transactions).Where(f => f.GroupId == groupId).ToListAsync();

        public async Task AddTransactionAsync(FundTransaction txn)
        {
            _context.FundTransactions.Add(txn);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<FundTransaction>> GetTransactionsByFundIdAsync(int fundId) =>
            await _context.FundTransactions
                .Where(t => t.FundId == fundId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

        public async Task SaveChangesAsync() => await _context.SaveChangesAsync();
    }
}


