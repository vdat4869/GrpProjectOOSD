using GroupManagementService.Models;
using GroupManagementService.Repositories;

namespace GroupManagementService.Services
{
    public class UsageService
    {
        private readonly IUsageRepository _usageRepo;
        private readonly IGroupRepository _groupRepo;

        public UsageService(IUsageRepository usageRepo, IGroupRepository groupRepo)
        {
            _usageRepo = usageRepo;
            _groupRepo = groupRepo;
        }

        public async Task LogUsageAsync(int groupId, UsageLogRequest request)
        {
            var group = await _groupRepo.GetByIdAsync(groupId) ?? throw new Exception("Group not found.");
            var memberExists = group.Members.Any(m => m.Id == request.MemberId);
            if (!memberExists) throw new Exception("Member not in group.");

            await _usageRepo.AddAsync(new VehicleUsage
            {
                GroupId = groupId,
                MemberId = request.MemberId,
                Date = request.Date,
                DistanceKm = request.DistanceKm,
                Purpose = request.Purpose
            });
        }

        public Task<IEnumerable<VehicleUsage>> GetUsageByGroupAsync(int groupId) => _usageRepo.GetByGroupAsync(groupId);

        public async Task<UsageAnalysisResponse> AnalyzeUsageAsync(int groupId)
        {
            var usages = await _usageRepo.GetByGroupAsync(groupId);
            var analysis = new UsageAnalysisResponse();
            foreach (var u in usages)
            {
                analysis.TotalKm += u.DistanceKm;
                if (!analysis.MemberKm.ContainsKey(u.MemberId)) analysis.MemberKm[u.MemberId] = 0;
                analysis.MemberKm[u.MemberId] += u.DistanceKm;
            }
            if (analysis.TotalKm > 0)
            {
                foreach (var kv in analysis.MemberKm)
                {
                    analysis.MemberPercentage[kv.Key] = Math.Round(100.0 * kv.Value / analysis.TotalKm, 2);
                }
            }
            return analysis;
        }

        public async Task<UsageSuggestionResponse> SuggestFairScheduleAsync(int groupId)
        {
            var usages = await _usageRepo.GetByGroupAsync(groupId);
            // Tính tổng km theo thành viên
            var byMember = usages
                .GroupBy(u => u.MemberId)
                .Select(g => new { MemberId = g.Key, Km = g.Sum(x => x.DistanceKm) })
                .OrderBy(x => x.Km)
                .ToList();

            var result = new UsageSuggestionResponse
            {
                SuggestedPriorityMemberIds = byMember.Select(x => x.MemberId).ToList(),
                Rationale = "Ưu tiên thành viên có tổng km thấp hơn để phân bổ công bằng"
            };
            return result;
        }
    }
}


