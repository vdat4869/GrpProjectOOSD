using GroupManagementService.Models;
using GroupManagementService.Repositories;

namespace GroupManagementService.Services
{
    public class GroupService
    {
        private readonly IGroupRepository _repo;
        public GroupService(IGroupRepository repo) => _repo = repo;

        public Task<IEnumerable<Group>> GetAllGroupsAsync() => _repo.GetAllAsync();
        public Task<Group?> GetGroupByIdAsync(int id) => _repo.GetByIdAsync(id);
        public Task<Group> CreateGroupAsync(Group group) => _repo.AddAsync(group);
    }
}
