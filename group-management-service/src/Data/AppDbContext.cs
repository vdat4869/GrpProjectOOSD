using GroupManagementService.Models;
using Microsoft.EntityFrameworkCore;

namespace GroupManagementService.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Group> Groups => Set<Group>();
        public DbSet<Member> Members => Set<Member>();
        public DbSet<Vote> Votes => Set<Vote>();
        public DbSet<MemberVote> MemberVotes => Set<MemberVote>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure relationships
            modelBuilder.Entity<MemberVote>()
                .HasOne(mv => mv.Vote)
                .WithMany(v => v.MemberVotes)
                .HasForeignKey(mv => mv.VoteId);

            modelBuilder.Entity<MemberVote>()
                .HasOne(mv => mv.Member)
                .WithMany()
                .HasForeignKey(mv => mv.MemberId);

            modelBuilder.Entity<Vote>()
                .HasOne(v => v.Group)
                .WithMany(g => g.Votes)
                .HasForeignKey(v => v.GroupId);
        }
    }
}
