using BookingService.Models;
using System.Threading.Tasks;
using BookingService.Repositories;
namespace BookingService.Repositories
{
    public interface IVehicleRepository
    {
        Task<Vehicle?> GetByIdAsync(int id);
        Task<IEnumerable<Vehicle>> GetAllAsync();
    }
}
