-- ============================================
-- TẠO DATABASE CHO PAYMENT SERVICE
-- ============================================
-- File này tạo database "payment_db" cho Payment Service
-- Database này quản lý thanh toán, ví điện tử, và chia sẻ chi phí
-- 
-- Các bảng chính trong database này:
-- - Wallets: Ví điện tử của từng người dùng trong mỗi nhóm xe
-- - CostShares: Chia sẻ chi phí (bảo trì, nhiên liệu, phí đường...)
-- - CostShareDetails: Chi tiết chia sẻ chi phí cho từng thành viên
-- - PaymentMethods: Phương thức thanh toán (ngân hàng, ví điện tử...)
-- - Payments: Giao dịch thanh toán
-- - Transactions: Lịch sử giao dịch trong ví
--
-- Các loại giao dịch:
-- - Deposit: Nạp tiền vào ví
-- - Withdrawal: Rút tiền từ ví
-- - Payment: Thanh toán chi phí
-- - Refund: Hoàn tiền
--
-- Lưu ý: Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

-- Kiểm tra xem database "payment_db" đã tồn tại chưa
-- Nếu chưa tồn tại thì mới tạo mới
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'payment_db')
BEGIN
	-- Tạo database mới với tên "payment_db"
	-- Database này sẽ sử dụng collation mặc định của SQL Server
	CREATE DATABASE [payment_db];
END;
GO


