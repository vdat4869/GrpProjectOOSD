-- ============================================
-- TẠO DATABASE CHO AUTH SERVICE
-- ============================================
-- File này tạo database "auth_db" cho Auth Service
-- Database này lưu trữ thông tin người dùng, xác thực, và KYC (Know Your Customer)
-- 
-- Các bảng chính trong database này:
-- - Users: Thông tin người dùng (email, password hash, thông tin cá nhân)
-- - Roles: Các vai trò trong hệ thống (Admin, Staff, CoOwner)
-- - UserRoles: Bảng liên kết giữa Users và Roles (many-to-many)
-- - IdentityDocuments: Giấy tờ tùy thân (CMND/CCCD, Passport)
-- - DrivingLicenses: Giấy phép lái xe
--
-- Lưu ý: Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

-- Kiểm tra xem database "auth_db" đã tồn tại chưa
-- Nếu chưa tồn tại thì mới tạo mới
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'auth_db')
BEGIN
	-- Tạo database mới với tên "auth_db"
	-- Database này sẽ sử dụng collation mặc định của SQL Server
	CREATE DATABASE [auth_db];
END;
GO


