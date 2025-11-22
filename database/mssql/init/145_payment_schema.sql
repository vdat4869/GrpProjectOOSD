-- ============================================
-- SCHEMA CHI TIẾT CHO PAYMENT DATABASE
-- ============================================
-- File này định nghĩa cấu trúc bảng cho database payment_db
-- Database này quản lý thanh toán, ví điện tử, và chia sẻ chi phí
-- 
-- Các bảng chính:
-- - Wallets: Ví điện tử của từng người dùng trong mỗi nhóm xe
-- - CostShares: Chia sẻ chi phí (bảo trì, nhiên liệu, phí đường...)
-- - CostShareDetails: Chi tiết chia sẻ chi phí cho từng thành viên
-- - PaymentMethods: Phương thức thanh toán (ngân hàng, ví điện tử...)
-- - Payments: Giao dịch thanh toán
-- - Transactions: Lịch sử giao dịch trong ví
--
-- Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

USE [payment_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Drop foreign key constraints first
IF OBJECT_ID(N'[dbo].[FK_Transactions_Related]', N'F') IS NOT NULL ALTER TABLE [dbo].[Transactions] DROP CONSTRAINT [FK_Transactions_Related];
IF OBJECT_ID(N'[dbo].[FK_Transactions_Wallets]', N'F') IS NOT NULL ALTER TABLE [dbo].[Transactions] DROP CONSTRAINT [FK_Transactions_Wallets];
IF OBJECT_ID(N'[dbo].[FK_Payments_Wallets]', N'F') IS NOT NULL ALTER TABLE [dbo].[Payments] DROP CONSTRAINT [FK_Payments_Wallets];
IF OBJECT_ID(N'[dbo].[FK_Payments_CostShareDetails]', N'F') IS NOT NULL ALTER TABLE [dbo].[Payments] DROP CONSTRAINT [FK_Payments_CostShareDetails];
IF OBJECT_ID(N'[dbo].[FK_CostShareDetails_CostShares]', N'F') IS NOT NULL ALTER TABLE [dbo].[CostShareDetails] DROP CONSTRAINT [FK_CostShareDetails_CostShares];
GO

-- Drop tables in correct order (child tables first)
IF OBJECT_ID(N'[dbo].[Transactions]', N'U') IS NOT NULL DROP TABLE [dbo].[Transactions];
IF OBJECT_ID(N'[dbo].[Payments]', N'U') IS NOT NULL DROP TABLE [dbo].[Payments];
IF OBJECT_ID(N'[dbo].[PaymentMethods]', N'U') IS NOT NULL DROP TABLE [dbo].[PaymentMethods];
IF OBJECT_ID(N'[dbo].[CostShareDetails]', N'U') IS NOT NULL DROP TABLE [dbo].[CostShareDetails];
IF OBJECT_ID(N'[dbo].[CostShares]', N'U') IS NOT NULL DROP TABLE [dbo].[CostShares];
IF SCHEMA_ID(N'Wallet') IS NOT NULL AND OBJECT_ID(N'[Wallet].[Wallets]', N'U') IS NOT NULL DROP TABLE [Wallet].[Wallets];
GO

IF SCHEMA_ID(N'Wallet') IS NULL EXEC('CREATE SCHEMA [Wallet]');
GO

-- ============================================
-- BẢNG WALLETS - VÍ ĐIỆN TỬ
-- ============================================
-- Lưu trữ ví điện tử của từng người dùng trong mỗi nhóm xe
-- Mỗi người dùng có một ví riêng cho mỗi nhóm xe mà họ tham gia
-- Ví được sử dụng để nạp tiền, thanh toán chi phí, và nhận tiền từ chia sẻ chi phí
-- ============================================
CREATE TABLE [Wallet].[Wallets] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Wallets] PRIMARY KEY,  -- ID duy nhất (GUID)
    [UserId] UNIQUEIDENTIFIER NOT NULL,  -- ID người dùng (foreign key đến Users trong auth_db)
    [GroupId] UNIQUEIDENTIFIER NOT NULL,  -- ID nhóm xe (foreign key đến VehicleGroups trong ownership_db)
    [Balance] DECIMAL(18,2) NOT NULL DEFAULT(0),  -- Số dư hiện tại
    [FrozenAmount] DECIMAL(18,2) NOT NULL DEFAULT(0),  -- Số tiền bị đóng băng (đang trong giao dịch)
    [Currency] NVARCHAR(3) NOT NULL DEFAULT(N'VND'),  -- Đơn vị tiền tệ (VND, USD...)
    [IsActive] BIT NOT NULL DEFAULT(1),  -- Trạng thái (1=active, 0=inactive)
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NULL,  -- Thời gian cập nhật
    [CreatedBy] NVARCHAR(200) NULL,  -- Người tạo
    [UpdatedBy] NVARCHAR(200) NULL,  -- Người cập nhật
    [IsDeleted] BIT NOT NULL DEFAULT(0)  -- Đã xóa chưa (soft delete)
);
GO

CREATE INDEX [IX_Wallets_User_Group] ON [Wallet].[Wallets]([UserId], [GroupId]);
GO

-- ============================================
-- BẢNG COSTSHARES - CHIA SẺ CHI PHÍ
-- ============================================
-- Lưu trữ các khoản chi phí cần chia sẻ giữa các chủ sở hữu
-- Chi phí được chia theo tỷ lệ sở hữu hoặc theo thỏa thuận
-- Các loại chi phí: Maintenance, Fuel, Insurance, Parking, Toll...
-- ============================================
CREATE TABLE [dbo].[CostShares] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_CostShares] PRIMARY KEY,  -- ID duy nhất (GUID)
    [GroupId] UNIQUEIDENTIFIER NOT NULL,  -- ID nhóm xe (foreign key đến VehicleGroups trong ownership_db)
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,  -- ID xe (foreign key đến Vehicles trong booking_db)
    [CostType] INT NOT NULL,  -- Loại chi phí (1=Maintenance, 2=Fuel, 3=Insurance, 4=Parking, 5=Toll...)
    [Title] NVARCHAR(200) NOT NULL,  -- Tiêu đề chi phí
    [Description] NVARCHAR(1000) NULL,  -- Mô tả chi tiết
    [TotalAmount] DECIMAL(18,2) NOT NULL,  -- Tổng số tiền
    [Currency] NVARCHAR(3) NOT NULL DEFAULT(N'VND'),  -- Đơn vị tiền tệ (VND, USD...)
    [DueDate] DATETIME2 NOT NULL,  -- Ngày đến hạn thanh toán
    [PaidDate] DATETIME2 NULL,  -- Ngày đã thanh toán (khi tất cả thành viên đã trả)
    [Status] INT NOT NULL,  -- Trạng thái (0=Pending, 1=Partial, 2=Paid, 3=Overdue)
    [ReceiptUrl] NVARCHAR(500) NULL,  -- URL hóa đơn/chứng từ
    [Metadata] NVARCHAR(1000) NULL,  -- Dữ liệu bổ sung (JSON)
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NULL,  -- Thời gian cập nhật
    [CreatedBy] NVARCHAR(200) NULL,  -- Người tạo
    [UpdatedBy] NVARCHAR(200) NULL,  -- Người cập nhật
    [IsDeleted] BIT NOT NULL DEFAULT(0)  -- Đã xóa chưa (soft delete)
);
GO

CREATE INDEX [IX_CostShares_Group_Vehicle] ON [dbo].[CostShares]([GroupId], [VehicleId]);
GO

CREATE TABLE [dbo].[CostShareDetails] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_CostShareDetails] PRIMARY KEY,
    [CostShareId] UNIQUEIDENTIFIER NOT NULL,
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [OwnershipPercentage] DECIMAL(5,2) NOT NULL,
    [Amount] DECIMAL(18,2) NOT NULL,
    [Currency] NVARCHAR(3) NOT NULL DEFAULT(N'VND'),
    [Status] INT NOT NULL,
    [PaidDate] DATETIME2 NULL,
    [Notes] NVARCHAR(500) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedBy] NVARCHAR(200) NULL,
    [UpdatedBy] NVARCHAR(200) NULL,
    [IsDeleted] BIT NOT NULL DEFAULT(0)
);
GO

CREATE UNIQUE INDEX [IX_CostShareDetails_CostShare_User] ON [dbo].[CostShareDetails]([CostShareId], [UserId]);
GO

CREATE TABLE [dbo].[PaymentMethods] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_PaymentMethods] PRIMARY KEY,
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [MethodType] NVARCHAR(50) NOT NULL,
    [AccountNumber] NVARCHAR(200) NOT NULL,
    [AccountName] NVARCHAR(200) NULL,
    [BankName] NVARCHAR(100) NULL,
    [BankCode] NVARCHAR(100) NULL,
    [IsDefault] BIT NOT NULL DEFAULT(0),
    [IsActive] BIT NOT NULL DEFAULT(1),
    [Metadata] NVARCHAR(1000) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedBy] NVARCHAR(200) NULL,
    [UpdatedBy] NVARCHAR(200) NULL,
    [IsDeleted] BIT NOT NULL DEFAULT(0)
);
GO

CREATE UNIQUE INDEX [IX_PaymentMethods_User_Method_Account] ON [dbo].[PaymentMethods]([UserId], [MethodType], [AccountNumber]);
GO

CREATE TABLE [dbo].[Payments] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Payments] PRIMARY KEY,
    [CostShareDetailId] UNIQUEIDENTIFIER NOT NULL,
    [WalletId] UNIQUEIDENTIFIER NOT NULL,
    [Method] INT NOT NULL,
    [Amount] DECIMAL(18,2) NOT NULL,
    [Currency] NVARCHAR(3) NOT NULL DEFAULT(N'VND'),
    [Status] INT NOT NULL,
    [TransactionId] NVARCHAR(200) NULL,
    [ExternalTransactionId] NVARCHAR(200) NULL,
    [PaymentUrl] NVARCHAR(1000) NULL,
    [CallbackUrl] NVARCHAR(1000) NULL,
    [ReturnUrl] NVARCHAR(1000) NULL,
    [ProcessedAt] DATETIME2 NULL,
    [ErrorMessage] NVARCHAR(1000) NULL,
    [Metadata] NVARCHAR(2000) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedBy] NVARCHAR(200) NULL,
    [UpdatedBy] NVARCHAR(200) NULL,
    [IsDeleted] BIT NOT NULL DEFAULT(0)
);
GO

CREATE INDEX [IX_Payments_CostShareDetailId] ON [dbo].[Payments]([CostShareDetailId]);
CREATE INDEX [IX_Payments_WalletId] ON [dbo].[Payments]([WalletId]);
GO

CREATE TABLE [dbo].[Transactions] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Transactions] PRIMARY KEY,
    [WalletId] UNIQUEIDENTIFIER NOT NULL,
    [Type] INT NOT NULL,
    [Amount] DECIMAL(18,2) NOT NULL,
    [Currency] NVARCHAR(3) NOT NULL DEFAULT(N'VND'),
    [Description] NVARCHAR(500) NULL,
    [Reference] NVARCHAR(100) NULL,
    [RelatedTransactionId] UNIQUEIDENTIFIER NULL,
    [Status] INT NOT NULL,
    [ProcessedAt] DATETIME2 NULL,
    [Metadata] NVARCHAR(1000) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedBy] NVARCHAR(200) NULL,
    [UpdatedBy] NVARCHAR(200) NULL,
    [IsDeleted] BIT NOT NULL DEFAULT(0)
);
GO

CREATE INDEX [IX_Transactions_WalletId] ON [dbo].[Transactions]([WalletId]);
CREATE INDEX [IX_Transactions_RelatedTransactionId] ON [dbo].[Transactions]([RelatedTransactionId]);
GO

ALTER TABLE [dbo].[CostShareDetails]
    ADD CONSTRAINT [FK_CostShareDetails_CostShares] FOREIGN KEY ([CostShareId]) REFERENCES [dbo].[CostShares]([Id]) ON DELETE CASCADE;
GO

ALTER TABLE [dbo].[Payments]
    ADD CONSTRAINT [FK_Payments_CostShareDetails] FOREIGN KEY ([CostShareDetailId]) REFERENCES [dbo].[CostShareDetails]([Id]) ON DELETE CASCADE;
GO

ALTER TABLE [dbo].[Payments]
    ADD CONSTRAINT [FK_Payments_Wallets] FOREIGN KEY ([WalletId]) REFERENCES [Wallet].[Wallets]([Id]) ON DELETE NO ACTION;
GO

ALTER TABLE [dbo].[Transactions]
    ADD CONSTRAINT [FK_Transactions_Wallets] FOREIGN KEY ([WalletId]) REFERENCES [Wallet].[Wallets]([Id]) ON DELETE CASCADE;
GO

ALTER TABLE [dbo].[Transactions]
    ADD CONSTRAINT [FK_Transactions_Related] FOREIGN KEY ([RelatedTransactionId]) REFERENCES [dbo].[Transactions]([Id]) ON DELETE NO ACTION;
GO
