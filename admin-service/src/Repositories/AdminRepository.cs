using AdminService.Models;
using Microsoft.EntityFrameworkCore;

namespace AdminService.Repositories
{
    public class AdminRepository : IAdminRepository
    {
        private readonly AppDbContext _db;
        public AdminRepository(AppDbContext db) => _db = db;

        public Task<ServiceOrder?> FindServiceOrderAsync(int id) =>
            _db.ServiceOrders.FirstOrDefaultAsync(x => x.Id == id);

        public async Task<ServiceOrderApproval> SaveServiceOrderDecisionAsync(ServiceOrderApproval decision, ServiceOrder so)
        {
            _db.ServiceOrderApprovals.Add(decision);
            _db.ServiceOrders.Update(so);
            await _db.SaveChangesAsync();
            return decision;
        }

        public Task<Dispute?> FindDisputeAsync(int id) =>
            _db.Disputes.FirstOrDefaultAsync(x => x.Id == id);

        public async Task<DisputeReview> SaveDisputeDecisionAsync(DisputeReview review, Dispute d)
        {
            _db.DisputeReviews.Add(review);
            _db.Disputes.Update(d);
            await _db.SaveChangesAsync();
            return review;
        }

        public async Task<ReportSnapshot> SaveReportAsync(ReportSnapshot r)
        {
            _db.ReportSnapshots.Add(r);
            await _db.SaveChangesAsync();
            return r;
        }

        public Task<List<ReportSnapshot>> GetReportsAsync(int groupId, string type, DateTime from, DateTime to) =>
            _db.ReportSnapshots
              .Where(x => x.GroupId == groupId && x.Type == type && x.PeriodStart >= from && x.PeriodEnd <= to)
              .OrderByDescending(x => x.GeneratedAt)
              .ToListAsync();
    }
}
