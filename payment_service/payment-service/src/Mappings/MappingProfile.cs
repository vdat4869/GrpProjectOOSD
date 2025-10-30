using AutoMapper;
using PaymentService.DTOs;
using PaymentService.Models;

namespace PaymentService.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // Wallet mappings removed

            // Transaction mappings
            CreateMap<Transaction, TransactionDto>();
            CreateMap<CreateTransactionDto, Transaction>();

            // CostShare mappings
            CreateMap<CostShare, CostShareDto>();
            CreateMap<CreateCostShareDto, CostShare>();
            CreateMap<UpdateCostShareDto, CostShare>()
                .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));

            // CostShareDetail mappings
            CreateMap<CostShareDetail, CostShareDetailDto>();
            CreateMap<CreateCostShareDetailDto, CostShareDetail>();

            // Payment mappings
            CreateMap<Payment, PaymentDto>();
            CreateMap<CreatePaymentDto, Payment>();

            // PaymentMethod mappings
            CreateMap<PaymentMethod, PaymentMethodDto>();
            CreateMap<CreatePaymentMethodDto, PaymentMethod>();
            CreateMap<UpdatePaymentMethodDto, PaymentMethod>()
                .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));
        }
    }
}
