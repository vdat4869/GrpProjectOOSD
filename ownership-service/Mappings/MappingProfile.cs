using AutoMapper;
using OwnershipService.Models;
using OwnershipService.DTOs;

namespace OwnershipService.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // CoOwner mappings
        CreateMap<CoOwner, CoOwnerDto>();

        // Ownership mappings
        CreateMap<Ownership, OwnershipDto>()
            .ForMember(dest => dest.CoOwnerName, opt => opt.MapFrom(src => src.CoOwner.FullName));

        CreateMap<CreateOwnershipDto, Ownership>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CoOwner, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore());

        // EContract mappings
        CreateMap<EContract, EContractDto>()
            .ForMember(dest => dest.CoOwnerName, opt => opt.MapFrom(src => src.CoOwner.FullName));

        CreateMap<CreateEContractDto, EContract>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CoOwner, opt => opt.Ignore())
            .ForMember(dest => dest.ContractStatus, opt => opt.MapFrom(src => "Pending"))
            .ForMember(dest => dest.DigitalSignature, opt => opt.Ignore())
            .ForMember(dest => dest.SignedAt, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore());
    }
}

