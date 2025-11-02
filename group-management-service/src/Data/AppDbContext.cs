using GroupManagementService.Models;  
using Microsoft.EntityFrameworkCore;  

namespace GroupManagementService.Data
{
    // Class AppDbContext kế thừa từ DbContext để quản lý kết nối và thao tác với database
    public class AppDbContext : DbContext
    {
        // Constructor: nhận cấu hình DbContextOptions và truyền lên class cha
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // DbSet: đại diện cho bảng Groups trong database, cho phép truy vấn và thao tác với dữ liệu nhóm
        public DbSet<Group> Groups => Set<Group>();
        
        // DbSet: đại diện cho bảng Members trong database, cho phép truy vấn và thao tác với dữ liệu thành viên
        public DbSet<Member> Members => Set<Member>();
        
        // DbSet: đại diện cho bảng Votes trong database, cho phép truy vấn và thao tác với dữ liệu cuộc bỏ phiếu
        public DbSet<Vote> Votes => Set<Vote>();
        
        // DbSet: đại diện cho bảng MemberVotes trong database, cho phép truy vấn và thao tác với dữ liệu phiếu bầu của thành viên
        public DbSet<MemberVote> MemberVotes => Set<MemberVote>();

        // DbSet: đại diện cho bảng Funds (quỹ chung)
        public DbSet<Fund> Funds => Set<Fund>();

        // DbSet: đại diện cho bảng FundTransactions (giao dịch quỹ)
        public DbSet<FundTransaction> FundTransactions => Set<FundTransaction>();

        // DbSet: lịch sử sử dụng xe
        public DbSet<VehicleUsage> VehicleUsages => Set<VehicleUsage>();

        // Override OnModelCreating để cấu hình các mối quan hệ giữa các entity
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Gọi phương thức của class cha để xử lý các cấu hình mặc định
            base.OnModelCreating(modelBuilder);

            // Cấu hình mối quan hệ: một MemberVote thuộc về một Vote, một Vote có nhiều MemberVote
            // Configure relationships
            modelBuilder.Entity<MemberVote>()
                .HasOne(mv => mv.Vote)  // MemberVote có một Vote
                .WithMany(v => v.MemberVotes)  // Vote có nhiều MemberVote
                .HasForeignKey(mv => mv.VoteId);  // Khóa ngoại là VoteId trong bảng MemberVote

            // Cấu hình mối quan hệ: một MemberVote thuộc về một Member, một Member có nhiều MemberVote
            modelBuilder.Entity<MemberVote>()
                .HasOne(mv => mv.Member)  // MemberVote có một Member
                .WithMany()  // Member có nhiều MemberVote (không cần navigation property trong Member)
                .HasForeignKey(mv => mv.MemberId);  // Khóa ngoại là MemberId trong bảng MemberVote

            // Cấu hình mối quan hệ: một Vote thuộc về một Group, một Group có nhiều Vote
            modelBuilder.Entity<Vote>()
                .HasOne(v => v.Group)  // Vote có một Group
                .WithMany(g => g.Votes)  // Group có nhiều Vote
                .HasForeignKey(v => v.GroupId);  // Khóa ngoại là GroupId trong bảng Vote

            // Cấu hình mối quan hệ Fund - FundTransaction
            modelBuilder.Entity<FundTransaction>()
                .HasOne(t => t.Fund)
                .WithMany(f => f.Transactions)
                .HasForeignKey(t => t.FundId);
        }
    }
}
