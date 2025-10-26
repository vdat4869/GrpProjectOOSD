using GroupManagementService.Models;
using GroupManagementService.Repositories;

namespace GroupManagementService.Services
{
    public class VotingService
    {
        private readonly IVoteRepository _voteRepo;
        private readonly IGroupRepository _groupRepo;

        public VotingService(IVoteRepository voteRepo, IGroupRepository groupRepo)
        {
            _voteRepo = voteRepo;
            _groupRepo = groupRepo;
        }

        public async Task<Vote> CreateVoteAsync(int groupId, string topic)
        {
            var group = await _groupRepo.GetByIdAsync(groupId);
            if (group == null) throw new Exception("Group not found.");

            var vote = new Vote { Topic = topic, GroupId = groupId };
            group.Votes.Add(vote);
            await _groupRepo.SaveChangesAsync();
            return vote;
        }

        public async Task CastVoteAsync(int voteId, int memberId, bool agree)
        {
            var vote = await _voteRepo.GetByIdAsync(voteId);
            if (vote == null) throw new Exception("Vote not found.");

            // Check if member already voted
            var existingVote = vote.MemberVotes.FirstOrDefault(mv => mv.MemberId == memberId);
            if (existingVote != null)
            {
                existingVote.Agree = agree;
            }
            else
            {
                vote.MemberVotes.Add(new MemberVote 
                { 
                    VoteId = voteId, 
                    MemberId = memberId, 
                    Agree = agree 
                });
            }

            // Calculate result if we have enough votes (at least 3)
            if (vote.MemberVotes.Count >= 3)
            {
                var agreeCount = vote.MemberVotes.Count(mv => mv.Agree);
                vote.Result = agreeCount > vote.MemberVotes.Count / 2;
            }

            await _voteRepo.SaveChangesAsync();
        }
    }
}
