using BookingService.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BookingService.Services
{
    /// <summary>
    /// Interface định nghĩa các phương thức xử lý business logic cho booking service
    /// </summary>
    public interface IBookingService
    {
        /// <summary>
        /// Lấy lịch trình của tất cả các xe (vehicles) kèm thông tin booking
        /// </summary>
        Task<IEnumerable<VehicleScheduleResponse>> GetVehicleSchedulesAsync();
        
        /// <summary>
        /// Lấy tất cả các booking trong hệ thống
        /// </summary>
        Task<IEnumerable<BookingResponse>> GetAllBookingsAsync();
        
        /// <summary>
        /// Tạo mới một booking
        /// </summary>
        /// <param name="request">Thông tin booking cần tạo</param>
        /// <returns>Thông tin booking vừa tạo, null nếu không thể tạo</returns>
        Task<BookingResponse?> CreateBookingAsync(CreateBookingRequest request);
        
        /// <summary>
        /// Cập nhật thông tin booking (thời gian, ghi chú, etc.)
        /// </summary>
        /// <param name="bookingId">ID của booking cần cập nhật</param>
        /// <param name="request">Thông tin mới của booking</param>
        /// <returns>Thông tin booking sau khi cập nhật, null nếu không tìm thấy</returns>
        Task<BookingResponse?> UpdateBookingAsync(int bookingId, UpdateBookingRequest request);
        
        /// <summary>
        /// Cập nhật trạng thái của booking
        /// </summary>
        /// <param name="bookingId">ID của booking</param>
        /// <param name="status">Trạng thái mới (Pending, Confirmed, Approved, InProgress, Completed, Cancelled, NoShow)</param>
        /// <returns>Thông tin booking sau khi cập nhật, null nếu không tìm thấy</returns>
        Task<BookingResponse?> UpdateBookingStatusAsync(int bookingId, string status);
        
        /// <summary>
        /// Hủy booking (chuyển trạng thái sang Cancelled)
        /// </summary>
        /// <param name="bookingId">ID của booking cần hủy</param>
        /// <returns>True nếu hủy thành công, False nếu không tìm thấy booking</returns>
        Task<bool> CancelBookingAsync(int bookingId);
        
        /// <summary>
        /// Kiểm tra và cập nhật các booking có trạng thái NoShow (không đến nhận xe)
        /// </summary>
        Task CheckAndUpdateNoShowBookingsAsync();
        
        /// <summary>
        /// Xóa booking khỏi database
        /// </summary>
        /// <param name="bookingId">ID của booking cần xóa</param>
        Task DeleteBookingAsync(int bookingId);
        
        /// <summary>
        /// Tạo QR code cho booking
        /// </summary>
        /// <param name="bookingId">ID của booking</param>
        /// <returns>QR code dưới dạng string hoặc base64 image</returns>
        Task<QrCodeResponse> GenerateQrCodeAsync(int bookingId);
        
        /// <summary>
        /// Check-in cho booking (nhận xe)
        /// </summary>
        /// <param name="bookingId">ID của booking</param>
        /// <param name="request">Request chứa QR code và digital signature</param>
        /// <returns>Thông tin check-in thành công</returns>
        Task<CheckInResponse> CheckInAsync(int bookingId, CheckInRequest request);
        
        /// <summary>
        /// Check-out cho booking (trả xe)
        /// </summary>
        /// <param name="bookingId">ID của booking</param>
        /// <param name="request">Request chứa distance (km) và cost (chi phí)</param>
        /// <returns>Thông tin check-out thành công</returns>
        Task<CheckOutResponse> CheckOutAsync(int bookingId, CheckOutRequest request);
        
        /// <summary>
        /// Lấy lịch sử booking của một co-owner
        /// </summary>
        /// <param name="coOwnerId">ID của co-owner</param>
        /// <returns>Danh sách lịch sử booking</returns>
        Task<IEnumerable<BookingHistoryResponse>> GetBookingHistoryAsync(int coOwnerId);
    }
}

