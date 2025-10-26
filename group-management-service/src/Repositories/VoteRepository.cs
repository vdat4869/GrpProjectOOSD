using GroupManagementService.Data;
using GroupManagementService.Models;
using Microsoft.EntityFrameworkCore;

namespace GroupManagementService.Repositories
{
    public class VoteRepository : IVoteRepository
    {
        private readonly AppDbContext _context;
        public VoteRepository(AppDbContext context) => _context = context;

        public async Task<Vote?> GetByIdAsync(int id) => 
            await _context.Votes
                .Include(v => v.MemberVotes)
                .FirstOrDefaultAsync(v => v.Id == id);

        public async Task<Vote> AddAsync(Vote vote)
        {
            _context.Votes.Add(vote);
            await _context.SaveChangesAsync();
            return vote;
        }

        public async Task SaveChangesAsync() => await _context.SaveChangesAsync();
    }
}
