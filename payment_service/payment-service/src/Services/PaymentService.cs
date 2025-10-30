using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.DTOs;
using PaymentService.Models;
using PaymentService.Services.Interfaces;

namespace PaymentService.Services
{
    public interface IPaymentService
    {
        Task<List<TransactionDto>> GetTransactionsAsync(Guid walletId, int page = 1, int pageSize = 20);
        Task<TransactionDto> CreateTransactionAsync(CreateTransactionDto dto);
    }

    public class PaymentService : IPaymentService
    {
        private readonly PaymentDbContext _context;
        private readonly IMapper _mapper;

        public PaymentService(PaymentDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // Wallet feature removed

        public async Task<List<TransactionDto>> GetTransactionsAsync(Guid walletId, int page = 1, int pageSize = 20)
        {
            var transactions = await _context.Transactions
                .Where(t => t.WalletId == walletId && !t.IsDeleted)
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            
            return _mapper.Map<List<TransactionDto>>(transactions);
        }

        public async Task<TransactionDto> CreateTransactionAsync(CreateTransactionDto dto)
        {
            var transaction = _mapper.Map<Transaction>(dto);
            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
            
            return _mapper.Map<TransactionDto>(transaction);
        }
    }
}
