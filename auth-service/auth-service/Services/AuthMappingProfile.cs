using AutoMapper;
using AuthService.Models;
using AuthService.DTOs;

namespace AuthService.Services;

/// <summary>
/// AutoMapper profile cho Auth Service
/// </summary>
public class AuthMappingProfile : Profile
{
    public AuthMappingProfile()
    {
        // Mapping từ User entity sang UserDto
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.Roles, opt => opt.MapFrom(src => src.UserRoles.Select(ur => ur.Role.Name).ToList()));
    }
}
