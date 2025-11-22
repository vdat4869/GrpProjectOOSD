-- ============================================
-- SCHEMA CHI TIẾT CHO OWNERSHIP DATABASE
-- ============================================
-- File này định nghĩa cấu trúc bảng cho database ownership_db
-- Schema này được đồng bộ với Entity Framework Core models trong Ownership Service
-- 
-- Database này quản lý:
-- - Quyền sở hữu xe (Ownerships)
-- - Nhóm xe (VehicleGroups)
-- - Chủ sở hữu (CoOwners)
-- - Hợp đồng điện tử (EContracts)
-- - Quỹ chung (GroupFunds, FundTransactions)
-- - Đề xuất và bỏ phiếu (Proposals, Votes)
-- - Tranh chấp (Disputes)
--
-- Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

USE [ownership_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================
-- XÓA CÁC BẢNG CŨ (NẾU CÓ)
-- ============================================
-- Xóa các bảng hiện có để đảm bảo schema khớp với codebase hiện tại
-- Thứ tự xóa: Bảng con trước, bảng cha sau (theo thứ tự foreign key)
-- ============================================
IF OBJECT_ID(N'[dbo].[Votes]', N'U') IS NOT NULL DROP TABLE [dbo].[Votes];
IF OBJECT_ID(N'[dbo].[FundTransactions]', N'U') IS NOT NULL DROP TABLE [dbo].[FundTransactions];
IF OBJECT_ID(N'[dbo].[GroupFunds]', N'U') IS NOT NULL DROP TABLE [dbo].[GroupFunds];
IF OBJECT_ID(N'[dbo].[GroupMembers]', N'U') IS NOT NULL DROP TABLE [dbo].[GroupMembers];
IF OBJECT_ID(N'[dbo].[Ownerships]', N'U') IS NOT NULL DROP TABLE [dbo].[Ownerships];
IF OBJECT_ID(N'[dbo].[EContracts]', N'U') IS NOT NULL DROP TABLE [dbo].[EContracts];
IF OBJECT_ID(N'[dbo].[Proposals]', N'U') IS NOT NULL DROP TABLE [dbo].[Proposals];
IF OBJECT_ID(N'[dbo].[VehicleGroups]', N'U') IS NOT NULL DROP TABLE [dbo].[VehicleGroups];
IF OBJECT_ID(N'[dbo].[CoOwners]', N'U') IS NOT NULL DROP TABLE [dbo].[CoOwners];
GO

-- ============================================
-- BẢNG COOWNERS - CHỦ SỞ HỮU ĐỒNG SỞ HỮU XE
-- ============================================
-- Lưu trữ thông tin các chủ sở hữu đồng sở hữu xe
-- Mỗi CoOwner tương ứng với một User trong Auth Service (qua UserId)
-- Thông tin này được đồng bộ từ Auth Service nhưng có thể có thêm thông tin riêng
-- ============================================
CREATE TABLE [dbo].[CoOwners] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_CoOwners] PRIMARY KEY,  -- ID duy nhất (GUID)
    [UserId] NVARCHAR(100) NOT NULL,  -- ID người dùng từ Auth Service (foreign key đến Users trong auth_db)
    [FullName] NVARCHAR(200) NOT NULL,  -- Họ tên đầy đủ
    [IdentityCardNumber] NVARCHAR(20) NOT NULL,  -- Số CMND/CCCD (duy nhất)
    [DrivingLicenseNumber] NVARCHAR(20) NULL,  -- Số giấy phép lái xe (tùy chọn)
    [Email] NVARCHAR(100) NOT NULL,  -- Email (duy nhất)
    [PhoneNumber] NVARCHAR(15) NULL,  -- Số điện thoại
    [Address] NVARCHAR(500) NULL,  -- Địa chỉ
    [IsVerified] BIT NOT NULL DEFAULT(0),  -- Đã xác minh KYC chưa (0=chưa, 1=rồi)
    [VerifiedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian xác minh
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())  -- Thời gian cập nhật
);
GO

CREATE UNIQUE INDEX [IX_CoOwners_UserId] ON [dbo].[CoOwners]([UserId]);
CREATE UNIQUE INDEX [IX_CoOwners_Email] ON [dbo].[CoOwners]([Email]);
CREATE UNIQUE INDEX [IX_CoOwners_IdentityCardNumber] ON [dbo].[CoOwners]([IdentityCardNumber]);
CREATE INDEX [IX_CoOwners_DrivingLicenseNumber] ON [dbo].[CoOwners]([DrivingLicenseNumber]);
GO

-- ============================================
-- BẢNG VEHICLEGROUPS - NHÓM XE
-- ============================================
-- Lưu trữ thông tin nhóm xe (một nhóm có thể có nhiều chủ sở hữu)
-- Mỗi nhóm xe đại diện cho một phương tiện được đồng sở hữu
-- Ví dụ: Nhóm "Xe ô tô ABC-123" có 3 chủ sở hữu với tỷ lệ 40%, 35%, 25%
-- ============================================
CREATE TABLE [dbo].[VehicleGroups] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_VehicleGroups] PRIMARY KEY,  -- ID duy nhất (GUID)
    [Name] NVARCHAR(200) NOT NULL,  -- Tên nhóm xe (ví dụ: "Nhóm xe ô tô gia đình")
    [Description] NVARCHAR(1000) NULL,  -- Mô tả nhóm xe
    [VehicleName] NVARCHAR(50) NOT NULL,  -- Tên xe (ví dụ: "Toyota Camry")
    [LicensePlate] NVARCHAR(20) NULL,  -- Biển số xe
    [VehicleModel] NVARCHAR(50) NULL,  -- Model xe
    [VehicleYear] NVARCHAR(20) NULL,  -- Năm sản xuất
    [CreatedByCoOwnerId] UNIQUEIDENTIFIER NULL,  -- ID chủ sở hữu tạo nhóm (foreign key đến CoOwners)
    [Status] INT NOT NULL,  -- Trạng thái nhóm (0=Inactive, 1=Active, 2=Suspended...)
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())  -- Thời gian cập nhật
);
GO

CREATE INDEX [IX_VehicleGroups_Name] ON [dbo].[VehicleGroups]([Name]);
CREATE INDEX [IX_VehicleGroups_Status] ON [dbo].[VehicleGroups]([Status]);
GO

-- ============================================
-- BẢNG OWNERSHIPS - QUYỀN SỞ HỮU
-- ============================================
-- Lưu trữ quyền sở hữu của mỗi CoOwner trong mỗi VehicleGroup
-- Một CoOwner có thể sở hữu nhiều nhóm xe với tỷ lệ khác nhau
-- Tổng OwnershipPercentage của tất cả CoOwners trong một nhóm phải = 100%
-- ============================================
CREATE TABLE [dbo].[Ownerships] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Ownerships] PRIMARY KEY,  -- ID duy nhất (GUID)
    [CoOwnerId] UNIQUEIDENTIFIER NOT NULL,  -- ID chủ sở hữu (foreign key đến CoOwners)
    [VehicleGroupId] UNIQUEIDENTIFIER NOT NULL,  -- ID nhóm xe (foreign key đến VehicleGroups)
    [OwnershipPercentage] DECIMAL(5,2) NOT NULL,  -- Tỷ lệ sở hữu (ví dụ: 40.50 = 40.5%)
    [StartDate] DATETIME2 NOT NULL,  -- Ngày bắt đầu sở hữu
    [EndDate] DATETIME2 NULL,  -- Ngày kết thúc sở hữu (NULL = vẫn đang sở hữu)
    [IsActive] BIT NOT NULL,  -- Trạng thái (1=active, 0=inactive)
    [Notes] NVARCHAR(1000) NULL,  -- Ghi chú
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())  -- Thời gian cập nhật
);
GO

CREATE INDEX [IX_Ownerships_CoOwner_Group_Active] ON [dbo].[Ownerships]([CoOwnerId], [VehicleGroupId], [IsActive]) WHERE [IsActive] = 1;
GO

CREATE TABLE [dbo].[EContracts] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_EContracts] PRIMARY KEY,
    [CoOwnerId] UNIQUEIDENTIFIER NOT NULL,
    [VehicleGroupId] UNIQUEIDENTIFIER NOT NULL,
    [ContractTitle] NVARCHAR(200) NOT NULL,
    [ContractContent] NVARCHAR(MAX) NOT NULL,
    [OwnershipPercentage] DECIMAL(5,2) NOT NULL,
    [ContractStatus] NVARCHAR(50) NOT NULL,
    [SignedAt] DATETIME2 NULL,
    [DigitalSignature] NVARCHAR(500) NULL,
    [Notes] NVARCHAR(1000) NULL,
    [FilePath] NVARCHAR(500) NULL,
    [FileName] NVARCHAR(100) NULL,
    [FileType] NVARCHAR(50) NULL,
    [FileSize] BIGINT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [ExpiresAt] DATETIME2 NULL
);
GO

CREATE INDEX [IX_EContracts_CoOwner_VehicleGroup] ON [dbo].[EContracts]([CoOwnerId], [VehicleGroupId]);
CREATE INDEX [IX_EContracts_ContractStatus] ON [dbo].[EContracts]([ContractStatus]);
GO

CREATE TABLE [dbo].[GroupMembers] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_GroupMembers] PRIMARY KEY,
    [VehicleGroupId] UNIQUEIDENTIFIER NOT NULL,
    [CoOwnerId] UNIQUEIDENTIFIER NOT NULL,
    [Role] INT NOT NULL,
    [Status] INT NOT NULL,
    [JoinedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [LeftAt] DATETIME2 NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
);
GO

CREATE INDEX [IX_GroupMembers_Group_CoOwner_Status] ON [dbo].[GroupMembers]([VehicleGroupId], [CoOwnerId], [Status]);
CREATE INDEX [IX_GroupMembers_Status] ON [dbo].[GroupMembers]([Status]);
GO

-- ============================================
-- BẢNG GROUPFUNDS - QUỸ CHUNG CỦA NHÓM XE
-- ============================================
-- Lưu trữ quỹ chung của mỗi nhóm xe
-- Quỹ này được dùng để chi trả các chi phí chung (bảo trì, sửa chữa, nhiên liệu...)
-- Mỗi nhóm xe có thể có nhiều quỹ (ví dụ: Quỹ bảo trì, Quỹ nhiên liệu...)
-- ============================================
CREATE TABLE [dbo].[GroupFunds] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_GroupFunds] PRIMARY KEY,  -- ID duy nhất (GUID)
    [VehicleGroupId] UNIQUEIDENTIFIER NOT NULL,  -- ID nhóm xe (foreign key đến VehicleGroups)
    [Name] NVARCHAR(100) NOT NULL,  -- Tên quỹ (ví dụ: "Quỹ bảo trì")
    [Description] NVARCHAR(500) NULL,  -- Mô tả quỹ
    [Balance] DECIMAL(18,2) NOT NULL,  -- Số dư hiện tại
    [Currency] NVARCHAR(3) NOT NULL,  -- Đơn vị tiền tệ (VND, USD...)
    [Status] INT NOT NULL,  -- Trạng thái (0=Inactive, 1=Active, 2=Frozen...)
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())  -- Thời gian cập nhật
);
GO

CREATE INDEX [IX_GroupFunds_VehicleGroupId] ON [dbo].[GroupFunds]([VehicleGroupId]);
CREATE INDEX [IX_GroupFunds_Status] ON [dbo].[GroupFunds]([Status]);
GO

-- ============================================
-- BẢNG FUNDTRANSACTIONS - GIAO DỊCH QUỸ
-- ============================================
-- Lưu trữ các giao dịch thu/chi trong quỹ chung
-- Type: 1=Deposit (Nạp tiền), 2=Withdrawal (Rút tiền), 3=Expense (Chi phí)
-- Mỗi giao dịch cần được phê duyệt bởi một chủ sở hữu khác
-- ============================================
CREATE TABLE [dbo].[FundTransactions] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_FundTransactions] PRIMARY KEY,  -- ID duy nhất (GUID)
    [GroupFundId] UNIQUEIDENTIFIER NOT NULL,  -- ID quỹ (foreign key đến GroupFunds)
    [CoOwnerId] UNIQUEIDENTIFIER NOT NULL,  -- ID chủ sở hữu thực hiện giao dịch (foreign key đến CoOwners)
    [Type] INT NOT NULL,  -- Loại giao dịch (1=Deposit, 2=Withdrawal, 3=Expense)
    [Amount] DECIMAL(18,2) NOT NULL,  -- Số tiền
    [Currency] NVARCHAR(3) NOT NULL,  -- Đơn vị tiền tệ (VND, USD...)
    [Description] NVARCHAR(500) NULL,  -- Mô tả giao dịch
    [Category] NVARCHAR(200) NULL,  -- Danh mục (Maintenance, Fuel, Insurance...)
    [ReceiptNumber] NVARCHAR(100) NULL,  -- Số hóa đơn/chứng từ
    [ReceiptImageUrl] NVARCHAR(500) NULL,  -- URL ảnh hóa đơn/chứng từ
    [Status] INT NOT NULL,  -- Trạng thái (0=Pending, 1=Approved, 2=Rejected)
    [ApprovedByCoOwnerId] UNIQUEIDENTIFIER NULL,  -- ID chủ sở hữu phê duyệt (foreign key đến CoOwners)
    [ApprovedAt] DATETIME2 NULL,  -- Thời gian phê duyệt
    [TransactionDate] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Ngày giao dịch
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())  -- Thời gian cập nhật
);
GO

CREATE INDEX [IX_FundTransactions_GroupFundId] ON [dbo].[FundTransactions]([GroupFundId]);
CREATE INDEX [IX_FundTransactions_CoOwnerId] ON [dbo].[FundTransactions]([CoOwnerId]);
CREATE INDEX [IX_FundTransactions_Type] ON [dbo].[FundTransactions]([Type]);
CREATE INDEX [IX_FundTransactions_Status] ON [dbo].[FundTransactions]([Status]);
CREATE INDEX [IX_FundTransactions_TransactionDate] ON [dbo].[FundTransactions]([TransactionDate]);
GO

-- ============================================
-- BẢNG PROPOSALS - ĐỀ XUẤT
-- ============================================
-- Lưu trữ các đề xuất trong nhóm xe (bảo trì, sửa chữa, mua sắm...)
-- Mỗi đề xuất cần được các chủ sở hữu bỏ phiếu (thông qua bảng Votes)
-- Các loại đề xuất: Maintenance, Repair, Purchase, Policy Change...
-- ============================================
CREATE TABLE [dbo].[Proposals] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Proposals] PRIMARY KEY,  -- ID duy nhất (GUID)
    [VehicleGroupId] UNIQUEIDENTIFIER NOT NULL,  -- ID nhóm xe (foreign key đến VehicleGroups)
    [CreatedByCoOwnerId] UNIQUEIDENTIFIER NOT NULL,  -- ID chủ sở hữu tạo đề xuất (foreign key đến CoOwners)
    [Title] NVARCHAR(200) NOT NULL,  -- Tiêu đề đề xuất
    [Description] NVARCHAR(2000) NULL,  -- Mô tả chi tiết
    [Type] INT NOT NULL,  -- Loại đề xuất (1=Maintenance, 2=Repair, 3=Purchase, 4=Policy...)
    [Details] NVARCHAR(1000) NULL,  -- Chi tiết bổ sung
    [EstimatedCost] DECIMAL(18,2) NULL,  -- Chi phí ước tính
    [Currency] NVARCHAR(3) NULL,  -- Đơn vị tiền tệ (VND, USD...)
    [Status] INT NOT NULL,  -- Trạng thái (0=Draft, 1=Open, 2=Approved, 3=Rejected, 4=Completed)
    [VotingStartDate] DATETIME2 NULL,  -- Ngày bắt đầu bỏ phiếu
    [VotingEndDate] DATETIME2 NULL,  -- Ngày kết thúc bỏ phiếu
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())  -- Thời gian cập nhật
);
GO

CREATE INDEX [IX_Proposals_VehicleGroupId] ON [dbo].[Proposals]([VehicleGroupId]);
CREATE INDEX [IX_Proposals_CreatedByCoOwnerId] ON [dbo].[Proposals]([CreatedByCoOwnerId]);
CREATE INDEX [IX_Proposals_Type] ON [dbo].[Proposals]([Type]);
CREATE INDEX [IX_Proposals_Status] ON [dbo].[Proposals]([Status]);
GO

-- ============================================
-- BẢNG VOTES - PHIẾU BẦU
-- ============================================
-- Lưu trữ phiếu bầu của các chủ sở hữu cho các đề xuất
-- Mỗi chủ sở hữu chỉ có thể bỏ phiếu một lần cho mỗi đề xuất
-- Choice: 1=Approve (Đồng ý), 2=Reject (Từ chối), 3=Abstain (Không bỏ phiếu)
-- ============================================
CREATE TABLE [dbo].[Votes] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Votes] PRIMARY KEY,  -- ID duy nhất (GUID)
    [ProposalId] UNIQUEIDENTIFIER NOT NULL,  -- ID đề xuất (foreign key đến Proposals)
    [CoOwnerId] UNIQUEIDENTIFIER NOT NULL,  -- ID chủ sở hữu bỏ phiếu (foreign key đến CoOwners)
    [Choice] INT NOT NULL,  -- Lựa chọn (1=Approve, 2=Reject, 3=Abstain)
    [Comment] NVARCHAR(500) NULL,  -- Bình luận (nếu có)
    [VotedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian bỏ phiếu
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())  -- Thời gian tạo
);
GO

CREATE UNIQUE INDEX [IX_Votes_ProposalId_CoOwnerId] ON [dbo].[Votes]([ProposalId], [CoOwnerId]);
CREATE INDEX [IX_Votes_ProposalId] ON [dbo].[Votes]([ProposalId]);
CREATE INDEX [IX_Votes_CoOwnerId] ON [dbo].[Votes]([CoOwnerId]);
GO

ALTER TABLE [dbo].[VehicleGroups] WITH CHECK
    ADD CONSTRAINT [FK_VehicleGroups_CoOwners_CreatedByCoOwnerId]
    FOREIGN KEY ([CreatedByCoOwnerId]) REFERENCES [dbo].[CoOwners]([Id]) ON DELETE NO ACTION;
GO
ALTER TABLE [dbo].[VehicleGroups] CHECK CONSTRAINT [FK_VehicleGroups_CoOwners_CreatedByCoOwnerId];
GO

ALTER TABLE [dbo].[Ownerships] WITH CHECK
    ADD CONSTRAINT [FK_Ownerships_CoOwners] FOREIGN KEY ([CoOwnerId]) REFERENCES [dbo].[CoOwners]([Id]) ON DELETE NO ACTION;
GO
ALTER TABLE [dbo].[Ownerships] CHECK CONSTRAINT [FK_Ownerships_CoOwners];
GO
ALTER TABLE [dbo].[Ownerships] WITH CHECK
    ADD CONSTRAINT [FK_Ownerships_VehicleGroups] FOREIGN KEY ([VehicleGroupId]) REFERENCES [dbo].[VehicleGroups]([Id]) ON DELETE CASCADE;
GO
ALTER TABLE [dbo].[Ownerships] CHECK CONSTRAINT [FK_Ownerships_VehicleGroups];
GO

ALTER TABLE [dbo].[EContracts] WITH CHECK
    ADD CONSTRAINT [FK_EContracts_CoOwners] FOREIGN KEY ([CoOwnerId]) REFERENCES [dbo].[CoOwners]([Id]) ON DELETE NO ACTION;
GO
ALTER TABLE [dbo].[EContracts] CHECK CONSTRAINT [FK_EContracts_CoOwners];
GO
ALTER TABLE [dbo].[EContracts] WITH CHECK
    ADD CONSTRAINT [FK_EContracts_VehicleGroups] FOREIGN KEY ([VehicleGroupId]) REFERENCES [dbo].[VehicleGroups]([Id]) ON DELETE NO ACTION;
GO
ALTER TABLE [dbo].[EContracts] CHECK CONSTRAINT [FK_EContracts_VehicleGroups];
GO

ALTER TABLE [dbo].[GroupMembers] WITH CHECK
    ADD CONSTRAINT [FK_GroupMembers_VehicleGroups] FOREIGN KEY ([VehicleGroupId]) REFERENCES [dbo].[VehicleGroups]([Id]) ON DELETE CASCADE;
GO
ALTER TABLE [dbo].[GroupMembers] CHECK CONSTRAINT [FK_GroupMembers_VehicleGroups];
GO
ALTER TABLE [dbo].[GroupMembers] WITH CHECK
    ADD CONSTRAINT [FK_GroupMembers_CoOwners] FOREIGN KEY ([CoOwnerId]) REFERENCES [dbo].[CoOwners]([Id]) ON DELETE NO ACTION;
GO
ALTER TABLE [dbo].[GroupMembers] CHECK CONSTRAINT [FK_GroupMembers_CoOwners];
GO

ALTER TABLE [dbo].[GroupFunds] WITH CHECK
    ADD CONSTRAINT [FK_GroupFunds_VehicleGroups] FOREIGN KEY ([VehicleGroupId]) REFERENCES [dbo].[VehicleGroups]([Id]) ON DELETE CASCADE;
GO
ALTER TABLE [dbo].[GroupFunds] CHECK CONSTRAINT [FK_GroupFunds_VehicleGroups];
GO

ALTER TABLE [dbo].[FundTransactions] WITH CHECK
    ADD CONSTRAINT [FK_FundTransactions_GroupFunds] FOREIGN KEY ([GroupFundId]) REFERENCES [dbo].[GroupFunds]([Id]) ON DELETE NO ACTION;
GO
ALTER TABLE [dbo].[FundTransactions] CHECK CONSTRAINT [FK_FundTransactions_GroupFunds];
GO
ALTER TABLE [dbo].[FundTransactions] WITH CHECK
    ADD CONSTRAINT [FK_FundTransactions_CoOwners] FOREIGN KEY ([CoOwnerId]) REFERENCES [dbo].[CoOwners]([Id]) ON DELETE NO ACTION;
GO
ALTER TABLE [dbo].[FundTransactions] CHECK CONSTRAINT [FK_FundTransactions_CoOwners];
GO

ALTER TABLE [dbo].[Proposals] WITH CHECK
    ADD CONSTRAINT [FK_Proposals_VehicleGroups] FOREIGN KEY ([VehicleGroupId]) REFERENCES [dbo].[VehicleGroups]([Id]) ON DELETE CASCADE;
GO
ALTER TABLE [dbo].[Proposals] CHECK CONSTRAINT [FK_Proposals_VehicleGroups];
GO
ALTER TABLE [dbo].[Proposals] WITH CHECK
    ADD CONSTRAINT [FK_Proposals_CoOwners] FOREIGN KEY ([CreatedByCoOwnerId]) REFERENCES [dbo].[CoOwners]([Id]) ON DELETE NO ACTION;
GO
ALTER TABLE [dbo].[Proposals] CHECK CONSTRAINT [FK_Proposals_CoOwners];
GO

ALTER TABLE [dbo].[Votes] WITH CHECK
    ADD CONSTRAINT [FK_Votes_Proposals] FOREIGN KEY ([ProposalId]) REFERENCES [dbo].[Proposals]([Id]) ON DELETE CASCADE;
GO
ALTER TABLE [dbo].[Votes] CHECK CONSTRAINT [FK_Votes_Proposals];
GO
ALTER TABLE [dbo].[Votes] WITH CHECK
    ADD CONSTRAINT [FK_Votes_CoOwners] FOREIGN KEY ([CoOwnerId]) REFERENCES [dbo].[CoOwners]([Id]) ON DELETE NO ACTION;
GO
ALTER TABLE [dbo].[Votes] CHECK CONSTRAINT [FK_Votes_CoOwners];
GO

