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
            CreateMap<CostShare, CostShareDto>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => 
                    src.Status == CostShareStatus.Paid ? PaymentStatus.Completed :
                    src.Status == CostShareStatus.Overdue ? PaymentStatus.Failed :
                    PaymentStatus.Pending));
            CreateMap<CreateCostShareDto, CostShare>();
            CreateMap<UpdateCostShareDto, CostShare>()
                .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));

            // CostShareDetail mappings
            CreateMap<CostShareDetail, CostShareDetailDto>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => 
                    src.Status == CostShareDetailStatus.Paid ? PaymentStatus.Completed :
                    src.Status == CostShareDetailStatus.Overdue ? PaymentStatus.Failed :
                    PaymentStatus.Pending));
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
