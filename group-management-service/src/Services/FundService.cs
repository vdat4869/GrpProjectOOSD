using GroupManagementService.Models;
using GroupManagementService.Repositories;

namespace GroupManagementService.Services
{
    public class FundService
    {
        private readonly IFundRepository _fundRepo;
        private readonly IGroupRepository _groupRepo;

        public FundService(IFundRepository fundRepo, IGroupRepository groupRepo)
        {
            _fundRepo = fundRepo;
            _groupRepo = groupRepo;
        }

        public async Task<Fund> CreateFundAsync(int groupId, string name)
        {
            var group = await _groupRepo.GetByIdAsync(groupId);
            if (group == null) throw new Exception("Group not found.");

            var fund = new Fund { GroupId = groupId, Name = name, Balance = 0m };
            return await _fundRepo.CreateAsync(fund);
        }

        public Task<Fund?> GetFundAsync(int fundId) => _fundRepo.GetByIdAsync(fundId);

        public Task<IEnumerable<Fund>> GetFundsByGroupAsync(int groupId) => _fundRepo.GetByGroupIdAsync(groupId);

        public async Task<Fund> DepositAsync(int fundId, decimal amount, string? description)
        {
            var fund = await _fundRepo.GetByIdAsync(fundId) ?? throw new Exception("Fund not found.");
            if (amount <= 0) throw new Exception("Amount must be positive.");
            fund.Balance += amount;
            await _fundRepo.AddTransactionAsync(new FundTransaction { FundId = fundId, Amount = amount, Type = "deposit", Description = description });
            await _fundRepo.SaveChangesAsync();
            return fund;
        }

                public async Task<Fund> WithdrawAsync(int fundId, decimal amount, string? description)                                                                  
        {
            var fund = await _fundRepo.GetByIdAsync(fundId) ?? throw new Exception("Fund not found.");                                                          
            if (amount <= 0) throw new Exception("Amount must be positive.");   
            if (fund.Balance < amount) throw new Exception("Insufficient balance.");                                                                            
            fund.Balance -= amount;
            await _fundRepo.AddTransactionAsync(new FundTransaction { FundId = fundId, Amount = -amount, Type = "withdraw", Description = description });       
            await _fundRepo.SaveChangesAsync();
            return fund;
        }

        public async Task<IEnumerable<FundTransaction>> GetTransactionsAsync(int fundId)
        {
            var fund = await _fundRepo.GetByIdAsync(fundId);
            if (fund == null) throw new Exception("Fund not found.");
            return await _fundRepo.GetTransactionsByFundIdAsync(fundId);
        }
    }
}


