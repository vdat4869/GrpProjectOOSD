using AdminService.Models;
using AdminService.Repositories;

namespace AdminService.Services
{
    public class AdminCoreService
    {
        private readonly IAdminRepository _repo;
        public AdminCoreService(IAdminRepository repo) => _repo = repo;

        public async Task<ServiceOrderApproval?> DecideServiceOrderAsync(int serviceOrderId, bool approve, string? note)
        {
            var so = await _repo.FindServiceOrderAsync(serviceOrderId);
            if (so == null) return null;

            so.Status = approve ? ServiceOrderStatus.Approved : ServiceOrderStatus.Rejected;

            var decision = new ServiceOrderApproval
            {
                ServiceOrderId = serviceOrderId,
                Decision = approve ? "Approved" : "Rejected",
                Note = note
            };
            await _repo.SaveServiceOrderDecisionAsync(decision, so);
            return decision;
        }

        public async Task<DisputeReview?> ReviewDisputeAsync(int disputeId, bool resolve, string? note)
        {
            var d = await _repo.FindDisputeAsync(disputeId);
            if (d == null) return null;

            d.Status = resolve ? DisputeStatus.Resolved : DisputeStatus.Rejected;

            var review = new DisputeReview
            {
                DisputeId = disputeId,
                Decision = resolve ? "Resolved" : "Rejected",
                Note = note
            };
            await _repo.SaveDisputeDecisionAsync(review, d);
            return review;
        }

        public async Task<ReportSnapshot> GenerateReportAsync(ReportQuery q)
        {
            // Demo snapshot (sau này thay bằng số liệu thật từ Payment/Group)
            var r = new ReportSnapshot
            {
                GroupId = q.GroupId,
                Type = q.Type,
                PeriodStart = q.From,
                PeriodEnd = q.To,
                TotalCost = 1234567m,
                FundBalance = 890000m
            };
            return await _repo.SaveReportAsync(r);
        }

        public Task<List<ReportSnapshot>> GetReportsAsync(int groupId, string type, DateTime from, DateTime to) =>
            _repo.GetReportsAsync(groupId, type, from, to);
    }
}
