using Microsoft.EntityFrameworkCore;

namespace AdminService.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> opt) : base(opt) {}

        public DbSet<ServiceOrder> ServiceOrders => Set<ServiceOrder>();
        public DbSet<ServiceOrderApproval> ServiceOrderApprovals => Set<ServiceOrderApproval>();
        public DbSet<Dispute> Disputes => Set<Dispute>();
        public DbSet<DisputeReview> DisputeReviews => Set<DisputeReview>();
        public DbSet<ReportSnapshot> ReportSnapshots => Set<ReportSnapshot>();

        protected override void OnModelCreating(ModelBuilder b)
        {
            b.Entity<ServiceOrder>().HasKey(x => x.Id);
            b.Entity<ServiceOrderApproval>().HasKey(x => x.Id);
            b.Entity<Dispute>().HasKey(x => x.Id);
            b.Entity<DisputeReview>().HasKey(x => x.Id);
            b.Entity<ReportSnapshot>().HasKey(x => x.Id);
        }
    }
}
