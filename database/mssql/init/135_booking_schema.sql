-- ============================================
-- SCHEMA CHI TIẾT CHO BOOKING DATABASE
-- ============================================
-- File này định nghĩa cấu trúc bảng cho database booking_db
-- Database này quản lý việc đặt xe, lịch sử dụng xe, và check-in/check-out
-- 
-- Các bảng chính:
-- - Vehicles: Danh sách các xe trong hệ thống
-- - CoOwners: Thông tin các chủ sở hữu (đồng bộ từ Ownership Service)
-- - Bookings: Lịch đặt xe (thời gian bắt đầu, kết thúc, trạng thái)
--
-- Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

USE [booking_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'[dbo].[Bookings]', N'U') IS NOT NULL DROP TABLE [dbo].[Bookings];
IF OBJECT_ID(N'[dbo].[CoOwners]', N'U') IS NOT NULL DROP TABLE [dbo].[CoOwners];
IF OBJECT_ID(N'[dbo].[Vehicles]', N'U') IS NOT NULL DROP TABLE [dbo].[Vehicles];
GO

-- ============================================
-- BẢNG VEHICLES - DANH SÁCH XE
-- ============================================
-- Lưu trữ danh sách các xe trong hệ thống
-- Thông tin này được đồng bộ từ Ownership Service (VehicleGroups)
-- ============================================
CREATE TABLE [dbo].[Vehicles] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Vehicles] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [Name] NVARCHAR(100) NOT NULL,  -- Tên xe (ví dụ: "Toyota Camry - ABC-123")
    [IsActive] BIT NOT NULL DEFAULT(1)  -- Trạng thái (1=active, 0=inactive)
);
GO

-- ============================================
-- BẢNG COOWNERS - CHỦ SỞ HỮU (ĐỒNG BỘ)
-- ============================================
-- Lưu trữ thông tin các chủ sở hữu (đồng bộ từ Ownership Service)
-- Bảng này được sử dụng để tối ưu hiệu suất query, tránh join với Ownership Service
-- ============================================
CREATE TABLE [dbo].[CoOwners] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_CoOwners] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [Name] NVARCHAR(100) NOT NULL,  -- Tên chủ sở hữu
    [OwnershipRatio] DECIMAL(5,2) NOT NULL,  -- Tỷ lệ sở hữu (ví dụ: 40.50 = 40.5%)
    [UsageCount] INT NOT NULL DEFAULT(0)  -- Số lần sử dụng xe (để phân tích)
);
GO

-- ============================================
-- BẢNG BOOKINGS - LỊCH ĐẶT XE
-- ============================================
-- Lưu trữ lịch đặt xe của các chủ sở hữu
-- Mỗi booking đại diện cho một lần sử dụng xe trong khoảng thời gian cụ thể
-- 
-- Các trạng thái:
-- - Pending: Đang chờ phê duyệt
-- - Approved: Đã được phê duyệt, sẵn sàng sử dụng
-- - Rejected: Bị từ chối
-- - InProgress: Đang sử dụng (đã check-in)
-- - Completed: Đã hoàn thành (đã check-out)
-- - Cancelled: Đã hủy
-- ============================================
CREATE TABLE [dbo].[Bookings] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Bookings] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [VehicleId] INT NOT NULL,  -- ID xe (foreign key đến Vehicles)
    [CoOwnerId] INT NOT NULL,  -- ID chủ sở hữu đặt xe (foreign key đến CoOwners)
    [StartTime] DATETIME2 NOT NULL,  -- Thời gian bắt đầu sử dụng
    [EndTime] DATETIME2 NOT NULL,  -- Thời gian kết thúc sử dụng
    [Status] NVARCHAR(20) NOT NULL DEFAULT(N'Pending'),  -- Trạng thái booking
    [Note] NVARCHAR(255) NULL,  -- Ghi chú (mục đích sử dụng...)
    [DistanceKm] DECIMAL(10,2) NULL,  -- Quãng đường đi được (sau khi check-out)
    [Cost] DECIMAL(18,2) NULL,  -- Chi phí sử dụng (tính theo quãng đường và thời gian)
    [CheckInTime] DATETIME2 NULL,  -- Thời gian check-in (bắt đầu sử dụng thực tế)
    [CheckOutTime] DATETIME2 NULL,  -- Thời gian check-out (kết thúc sử dụng thực tế)
    [QrCode] NVARCHAR(500) NULL,  -- Mã QR để check-in/check-out
    [DigitalSignature] NVARCHAR(1000) NULL,  -- Chữ ký số khi check-out (xác nhận trạng thái xe)
    -- Foreign key: Khi xóa Vehicle thì xóa luôn tất cả bookings của xe đó
    CONSTRAINT [FK_Bookings_Vehicles] FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicles]([Id]) ON DELETE CASCADE,
    -- Foreign key: Khi xóa CoOwner thì không xóa bookings (giữ lại lịch sử)
    CONSTRAINT [FK_Bookings_CoOwners] FOREIGN KEY ([CoOwnerId]) REFERENCES [dbo].[CoOwners]([Id]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_Vehicles_Name] ON [dbo].[Vehicles]([Name]);
CREATE INDEX [IX_CoOwners_Name] ON [dbo].[CoOwners]([Name]);
CREATE INDEX [IX_CoOwners_OwnershipRatio] ON [dbo].[CoOwners]([OwnershipRatio]);
CREATE INDEX [IX_Bookings_VehicleId] ON [dbo].[Bookings]([VehicleId]);
CREATE INDEX [IX_Bookings_CoOwnerId] ON [dbo].[Bookings]([CoOwnerId]);
CREATE INDEX [IX_Bookings_TimeRange] ON [dbo].[Bookings]([StartTime], [EndTime]);
GO


