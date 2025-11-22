-- ============================================
-- TẠO DATABASE CHO BOOKING SERVICE
-- ============================================
-- File này tạo database "booking_db" cho Booking Service
-- Database này quản lý việc đặt xe, lịch sử dụng xe, và check-in/check-out
-- 
-- Các bảng chính trong database này:
-- - Vehicles: Danh sách các xe trong hệ thống
-- - CoOwners: Thông tin các chủ sở hữu (đồng bộ từ Ownership Service)
-- - Bookings: Lịch đặt xe (thời gian bắt đầu, kết thúc, trạng thái)
-- - BookingHistory: Lịch sử sử dụng xe (sau khi hoàn thành booking)
--
-- Các trạng thái booking:
-- - Pending: Đang chờ phê duyệt
-- - Approved: Đã được phê duyệt
-- - Rejected: Bị từ chối
-- - InProgress: Đang sử dụng
-- - Completed: Đã hoàn thành
-- - Cancelled: Đã hủy
--
-- Lưu ý: Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

-- Kiểm tra xem database "booking_db" đã tồn tại chưa
-- Nếu chưa tồn tại thì mới tạo mới
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'booking_db')
BEGIN
	-- Tạo database mới với tên "booking_db"
	-- Database này sẽ sử dụng collation mặc định của SQL Server
	CREATE DATABASE [booking_db];
END;
GO


