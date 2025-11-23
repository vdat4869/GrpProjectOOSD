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


-- ============================================
-- SCHEMA CHI TIẾT CHO REPORT DATABASE
-- ============================================
-- File này định nghĩa cấu trúc bảng cho database report_db
-- Database này lưu trữ dữ liệu phân tích, báo cáo, và lịch sử sử dụng xe
-- 
-- Các bảng chính:
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
-- Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

USE [report_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'[dbo].[AnalyticsReports]', N'U') IS NOT NULL DROP TABLE [dbo].[AnalyticsReports];
IF OBJECT_ID(N'[dbo].[CostRecords]', N'U') IS NOT NULL DROP TABLE [dbo].[CostRecords];
IF OBJECT_ID(N'[dbo].[MaintenanceRecords]', N'U') IS NOT NULL DROP TABLE [dbo].[MaintenanceRecords];
IF OBJECT_ID(N'[dbo].[ChargingSessions]', N'U') IS NOT NULL DROP TABLE [dbo].[ChargingSessions];
IF OBJECT_ID(N'[dbo].[UsageHistories]', N'U') IS NOT NULL DROP TABLE [dbo].[UsageHistories];
GO

-- ============================================
-- BẢNG USAGEHISTORIES - LỊCH SỬ SỬ DỤNG XE
-- ============================================
-- Lưu trữ lịch sử sử dụng xe chi tiết (sau khi hoàn thành booking)
-- Dữ liệu này được tạo từ booking sau khi check-out
-- Sử dụng để phân tích xu hướng sử dụng, tính toán chi phí, và báo cáo
-- ============================================
CREATE TABLE [dbo].[UsageHistories] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_UsageHistories] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [VehicleId] INT NOT NULL,  -- ID xe
    [CoOwnerId] INT NOT NULL,  -- ID chủ sở hữu sử dụng
    [StartTime] DATETIME2 NOT NULL,  -- Thời gian bắt đầu sử dụng
    [EndTime] DATETIME2 NOT NULL,  -- Thời gian kết thúc sử dụng
    [StartLocation] NVARCHAR(255) NULL,  -- Địa điểm bắt đầu (GPS coordinates hoặc địa chỉ)
    [EndLocation] NVARCHAR(255) NULL,  -- Địa điểm kết thúc (GPS coordinates hoặc địa chỉ)
    [DistanceKm] DECIMAL(10,2) NOT NULL,  -- Quãng đường đi được (km)
    [StartBatteryLevel] DECIMAL(5,2) NOT NULL,  -- Mức pin bắt đầu (%)
    [EndBatteryLevel] DECIMAL(5,2) NOT NULL,  -- Mức pin kết thúc (%)
    [EnergyConsumed] DECIMAL(10,2) NOT NULL,  -- Năng lượng tiêu thụ (kWh)
    [Cost] DECIMAL(18,2) NOT NULL,  -- Chi phí sử dụng (tính theo quãng đường và năng lượng)
    [Purpose] NVARCHAR(255) NULL,  -- Mục đích sử dụng (Personal, Business, Family...)
    [Notes] NVARCHAR(500) NULL,  -- Ghi chú
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian cập nhật
    [IsActive] BIT NOT NULL DEFAULT(1)  -- Trạng thái (1=active, 0=deleted)
);
GO

CREATE INDEX [IX_UsageHistories_VehicleId] ON [dbo].[UsageHistories]([VehicleId]);
CREATE INDEX [IX_UsageHistories_CoOwnerId] ON [dbo].[UsageHistories]([CoOwnerId]);
CREATE INDEX [IX_UsageHistories_StartTime] ON [dbo].[UsageHistories]([StartTime]);
CREATE INDEX [IX_UsageHistories_EndTime] ON [dbo].[UsageHistories]([EndTime]);
GO

CREATE TABLE [dbo].[ChargingSessions] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_ChargingSessions] PRIMARY KEY,
    [VehicleId] INT NOT NULL,
    [CoOwnerId] INT NOT NULL,
    [ChargingStationId] NVARCHAR(100) NULL,
    [StartTime] DATETIME2 NOT NULL,
    [EndTime] DATETIME2 NOT NULL,
    [StartBatteryLevel] DECIMAL(5,2) NOT NULL,
    [EndBatteryLevel] DECIMAL(5,2) NOT NULL,
    [EnergyConsumed] DECIMAL(10,2) NOT NULL,
    [Cost] DECIMAL(18,2) NOT NULL,
    [ChargingType] NVARCHAR(50) NULL,
    [ChargingPower] DECIMAL(10,2) NULL,
    [Location] NVARCHAR(255) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [IsActive] BIT NOT NULL DEFAULT(1)
);
GO

CREATE INDEX [IX_ChargingSessions_VehicleId] ON [dbo].[ChargingSessions]([VehicleId]);
CREATE INDEX [IX_ChargingSessions_CoOwnerId] ON [dbo].[ChargingSessions]([CoOwnerId]);
CREATE INDEX [IX_ChargingSessions_StartTime] ON [dbo].[ChargingSessions]([StartTime]);
GO

CREATE TABLE [dbo].[MaintenanceRecords] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_MaintenanceRecords] PRIMARY KEY,
    [VehicleId] INT NOT NULL,
    [MaintenanceType] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(500) NULL,
    [ServiceProvider] NVARCHAR(255) NULL,
    [Cost] DECIMAL(18,2) NOT NULL,
    [Currency] NVARCHAR(3) NOT NULL DEFAULT(N'VND'),
    [MileageAtService] DECIMAL(10,2) NOT NULL,
    [ServiceDate] DATETIME2 NOT NULL,
    [NextServiceDue] DATETIME2 NOT NULL,
    [Status] INT NOT NULL DEFAULT(2),
    [Notes] NVARCHAR(500) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [IsActive] BIT NOT NULL DEFAULT(1)
);
GO

CREATE INDEX [IX_MaintenanceRecords_VehicleId] ON [dbo].[MaintenanceRecords]([VehicleId]);
CREATE INDEX [IX_MaintenanceRecords_ServiceDate] ON [dbo].[MaintenanceRecords]([ServiceDate]);
GO

CREATE TABLE [dbo].[CostRecords] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_CostRecords] PRIMARY KEY,
    [VehicleId] INT NOT NULL,
    [CoOwnerId] INT NOT NULL,
    [CostType] NVARCHAR(50) NOT NULL,
    [Description] NVARCHAR(500) NULL,
    [Amount] DECIMAL(18,2) NOT NULL,
    [Currency] NVARCHAR(3) NOT NULL DEFAULT(N'VND'),
    [ExpenseDate] DATETIME2 NOT NULL,
    [PaymentStatus] INT NOT NULL DEFAULT(0),
    [Notes] NVARCHAR(500) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [IsActive] BIT NOT NULL DEFAULT(1)
);
GO

CREATE INDEX [IX_CostRecords_VehicleId] ON [dbo].[CostRecords]([VehicleId]);
CREATE INDEX [IX_CostRecords_CoOwnerId] ON [dbo].[CostRecords]([CoOwnerId]);
CREATE INDEX [IX_CostRecords_CostType] ON [dbo].[CostRecords]([CostType]);
CREATE INDEX [IX_CostRecords_ExpenseDate] ON [dbo].[CostRecords]([ExpenseDate]);
GO

CREATE TABLE [dbo].[AnalyticsReports] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_AnalyticsReports] PRIMARY KEY,
    [VehicleId] INT NOT NULL,
    [ReportType] NVARCHAR(50) NOT NULL,
    [PeriodStart] DATETIME2 NOT NULL,
    [PeriodEnd] DATETIME2 NOT NULL,
    [ReportData] NVARCHAR(MAX) NOT NULL,
    [GeneratedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [IsActive] BIT NOT NULL DEFAULT(1)
);
GO

CREATE INDEX [IX_AnalyticsReports_VehicleId] ON [dbo].[AnalyticsReports]([VehicleId]);
CREATE INDEX [IX_AnalyticsReports_ReportType] ON [dbo].[AnalyticsReports]([ReportType]);
CREATE INDEX [IX_AnalyticsReports_PeriodStart] ON [dbo].[AnalyticsReports]([PeriodStart]);
CREATE INDEX [IX_AnalyticsReports_PeriodEnd] ON [dbo].[AnalyticsReports]([PeriodEnd]);
GO
