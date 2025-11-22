-- ============================================
-- TẠO DATABASE CHO REPORT SERVICE
-- ============================================
-- File này tạo database "report_db" cho Report Service
-- Database này lưu trữ dữ liệu phân tích, báo cáo, và lịch sử sử dụng xe
-- (Trước đây được gọi là history analytics database)
-- 
-- Các bảng chính trong database này:
-- - UsageHistories: Lịch sử sử dụng xe (quãng đường, năng lượng tiêu thụ, chi phí)
-- - ChargingSessions: Lịch sử sạc xe (thời gian, năng lượng, chi phí)
-- - MaintenanceRecords: Hồ sơ bảo trì xe (loại bảo trì, chi phí, ngày bảo trì)
-- - CostRecords: Bản ghi chi phí (nhiên liệu, phí đường, phí đỗ xe...)
-- - AnalyticsReports: Báo cáo phân tích (báo cáo theo thời gian, theo xe...)
--
-- Mục đích sử dụng:
-- - Phân tích xu hướng sử dụng xe
-- - Tính toán chi phí và chia sẻ chi phí
-- - Báo cáo hiệu suất và bảo trì
-- - Dự đoán nhu cầu bảo trì
--
-- Lưu ý: Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

-- Kiểm tra xem database "report_db" đã tồn tại chưa
-- Nếu chưa tồn tại thì mới tạo mới
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'report_db')
BEGIN
	-- Tạo database mới với tên "report_db"
	-- Database này sẽ sử dụng collation mặc định của SQL Server
	CREATE DATABASE [report_db];
END;
GO


