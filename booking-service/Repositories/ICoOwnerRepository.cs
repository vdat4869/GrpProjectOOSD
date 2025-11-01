using BookingService.Models;
using System.Threading.Tasks;
using BookingService.Repositories;
namespace BookingService.Repositories
{
    public interface ICoOwnerRepository
    {
        Task<CoOwner?> GetByIdAsync(int id);
        Task<IEnumerable<CoOwner>> GetAllAsync();
        Task UpdateAsync(CoOwner coOwner);
    }
}
