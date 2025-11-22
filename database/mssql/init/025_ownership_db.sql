-- ============================================
-- TẠO DATABASE CHO OWNERSHIP SERVICE
-- ============================================
-- File này tạo database "ownership_db" cho Ownership Service
-- Database này quản lý quyền sở hữu xe, nhóm xe, và các hoạt động liên quan
-- 
-- Các bảng chính trong database này:
-- - CoOwners: Thông tin các chủ sở hữu đồng sở hữu xe
-- - VehicleGroups: Nhóm xe (một nhóm có thể có nhiều chủ sở hữu)
-- - Ownerships: Quyền sở hữu (tỷ lệ phần trăm sở hữu của mỗi CoOwner)
-- - EContracts: Hợp đồng điện tử giữa các chủ sở hữu
-- - GroupMembers: Thành viên trong nhóm xe
-- - GroupFunds: Quỹ chung của nhóm xe
-- - FundTransactions: Giao dịch quỹ (thu/chi)
-- - Proposals: Đề xuất (bảo trì, sửa chữa, mua sắm...)
-- - Votes: Phiếu bầu cho các đề xuất
-- - Disputes: Tranh chấp giữa các chủ sở hữu
--
-- Lưu ý: Database này được merge từ AccountDB và GroupDB cũ
-- Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

-- Kiểm tra xem database "ownership_db" đã tồn tại chưa
-- Nếu chưa tồn tại thì mới tạo mới
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ownership_db')
BEGIN
	-- Tạo database mới với tên "ownership_db"
	-- Database này sẽ sử dụng collation mặc định của SQL Server
	CREATE DATABASE [ownership_db];
END;
GO


