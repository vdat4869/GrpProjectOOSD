using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Queries;

public class GetAllCoOwnersQuery : IRequest<List<CoOwnerDto>>
{
    public bool? IsVerified { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }

    public GetAllCoOwnersQuery(bool? isVerified = null, int page = 1, int pageSize = 10, string? search = null)
    {
        IsVerified = isVerified;
        Page = page < 1 ? 1 : page;
        PageSize = pageSize <= 0 ? 10 : pageSize;
        Search = search;
    }
}

