using AdminService.Models;

namespace AdminService.Repositories
{
    public interface IAdminRepository
    {
        Task<ServiceOrder?> FindServiceOrderAsync(int id);
        Task<ServiceOrderApproval> SaveServiceOrderDecisionAsync(ServiceOrderApproval decision, ServiceOrder so);

        Task<Dispute?> FindDisputeAsync(int id);
        Task<DisputeReview> SaveDisputeDecisionAsync(DisputeReview review, Dispute d);

        Task<ReportSnapshot> SaveReportAsync(ReportSnapshot r);
        Task<List<ReportSnapshot>> GetReportsAsync(int groupId, string type, DateTime from, DateTime to);
    }
}
