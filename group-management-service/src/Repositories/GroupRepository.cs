using GroupManagementService.Data;
using GroupManagementService.Models;
using Microsoft.EntityFrameworkCore;

namespace GroupManagementService.Repositories
{
    public class GroupRepository : IGroupRepository
    {
        private readonly AppDbContext _context;
        public GroupRepository(AppDbContext context) => _context = context;

        public async Task<IEnumerable<Group>> GetAllAsync() =>
            await _context.Groups.Include(g => g.Members).ToListAsync();

        public async Task<Group?> GetByIdAsync(int id) =>
            await _context.Groups.Include(g => g.Members)
                                 .Include(g => g.Votes)
                                    .ThenInclude(v => v.MemberVotes)
                                 .FirstOrDefaultAsync(g => g.Id == id);

        public async Task<Group> AddAsync(Group group)
        {
            _context.Groups.Add(group);
            await _context.SaveChangesAsync();
            return group;
        }

        public async Task SaveChangesAsync() => await _context.SaveChangesAsync();
    }
}
