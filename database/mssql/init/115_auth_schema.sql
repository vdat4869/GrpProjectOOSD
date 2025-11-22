-- ============================================
-- SCHEMA CHI TIẾT CHO AUTH DATABASE
-- ============================================
-- File này định nghĩa cấu trúc bảng cho database auth_db
-- Schema này được đồng bộ với Entity Framework Core models trong Auth Service
-- 
-- Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- Yêu cầu: Database 'auth_db' phải đã được tạo trước
-- ============================================

-- Chuyển sang sử dụng database auth_db
USE [auth_db];
GO

-- Thiết lập các cấu hình SQL Server
-- ANSI_NULLS: Xử lý NULL theo chuẩn ANSI SQL
-- QUOTED_IDENTIFIER: Cho phép sử dụng dấu ngoặc vuông [] cho tên đối tượng
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================
-- XÓA CÁC BẢNG CŨ (NẾU CÓ)
-- ============================================
-- Xóa các bảng hiện có để đảm bảo schema khớp với EF Core models
-- Thứ tự xóa: Bảng con trước, bảng cha sau (theo thứ tự foreign key)
-- ============================================
IF OBJECT_ID(N'[dbo].[UserRoles]', N'U') IS NOT NULL DROP TABLE [dbo].[UserRoles];
IF OBJECT_ID(N'[dbo].[DrivingLicenses]', N'U') IS NOT NULL DROP TABLE [dbo].[DrivingLicenses];
IF OBJECT_ID(N'[dbo].[IdentityDocuments]', N'U') IS NOT NULL DROP TABLE [dbo].[IdentityDocuments];
IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL DROP TABLE [dbo].[Users];
IF OBJECT_ID(N'[dbo].[Roles]', N'U') IS NOT NULL DROP TABLE [dbo].[Roles];
IF OBJECT_ID(N'[dbo].[__EFMigrationsHistory]', N'U') IS NOT NULL DROP TABLE [dbo].[__EFMigrationsHistory];
GO

-- ============================================
-- BẢNG ROLES - VAI TRÒ TRONG HỆ THỐNG
-- ============================================
-- Lưu trữ các vai trò (roles) trong hệ thống
-- Mỗi người dùng có thể có nhiều vai trò (many-to-many với Users)
-- 
-- Các vai trò mặc định:
-- - CoOwner: Chủ sở hữu đồng sở hữu xe
-- - Staff: Nhân viên quản lý
-- - Admin: Quản trị viên hệ thống
-- ============================================
CREATE TABLE [dbo].[Roles] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Roles] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [Name] NVARCHAR(50) NOT NULL,  -- Tên vai trò (duy nhất, không được trùng)
    [Description] NVARCHAR(255) NULL,  -- Mô tả vai trò
    [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())  -- Thời gian tạo (UTC)
);
GO

-- Tạo index duy nhất cho cột Name để đảm bảo không có 2 vai trò trùng tên
CREATE UNIQUE INDEX [IX_Roles_Name] ON [dbo].[Roles]([Name]);
GO

-- ============================================
-- BẢNG USERS - THÔNG TIN NGƯỜI DÙNG
-- ============================================
-- Lưu trữ thông tin cơ bản của người dùng trong hệ thống
-- Bao gồm thông tin xác thực (email, password hash) và thông tin cá nhân
-- ============================================
CREATE TABLE [dbo].[Users] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Users] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [Email] NVARCHAR(255) NOT NULL,  -- Email đăng nhập (duy nhất, không được trùng)
    [PasswordHash] NVARCHAR(255) NOT NULL,  -- Mật khẩu đã được hash (bcrypt/argon2)
    [FirstName] NVARCHAR(100) NOT NULL,  -- Tên
    [LastName] NVARCHAR(100) NOT NULL,  -- Họ
    [PhoneNumber] NVARCHAR(20) NULL,  -- Số điện thoại (tùy chọn)
    [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),  -- Thời gian tạo tài khoản (UTC)
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),  -- Thời gian cập nhật lần cuối (UTC)
    [IsActive] BIT NOT NULL DEFAULT(1),  -- Trạng thái tài khoản (1=active, 0=inactive/deleted)
    [RefreshToken] NVARCHAR(MAX) NULL,  -- Refresh token để làm mới access token (JWT)
    [RefreshTokenExpiryTime] DATETIME2 NULL  -- Thời gian hết hạn của refresh token
);
GO

-- Tạo index duy nhất cho cột Email để đảm bảo không có 2 người dùng trùng email
CREATE UNIQUE INDEX [IX_Users_Email] ON [dbo].[Users]([Email]);
GO

-- ============================================
-- BẢNG IDENTITYDOCUMENTS - GIẤY TỜ TÙY THÂN
-- ============================================
-- Lưu trữ thông tin giấy tờ tùy thân của người dùng (CMND/CCCD, Passport)
-- Một người dùng có thể có nhiều giấy tờ (ví dụ: CMND và Passport)
-- Sử dụng cho KYC (Know Your Customer) verification
-- ============================================
CREATE TABLE [dbo].[IdentityDocuments] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_IdentityDocuments] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [UserId] INT NOT NULL,  -- ID người dùng (foreign key đến Users)
    [DocumentType] INT NOT NULL,  -- Loại giấy tờ (1=CMND, 2=CCCD, 3=Passport, ...)
    [DocumentNumber] NVARCHAR(50) NOT NULL,  -- Số giấy tờ (CMND/CCCD/Passport number)
    [FullName] NVARCHAR(200) NOT NULL,  -- Họ tên đầy đủ trên giấy tờ
    [DateOfBirth] DATETIME2 NOT NULL,  -- Ngày sinh
    [Gender] NVARCHAR(MAX) NULL,  -- Giới tính
    [Nationality] NVARCHAR(MAX) NULL,  -- Quốc tịch
    [PlaceOfIssue] NVARCHAR(MAX) NULL,  -- Nơi cấp
    [IssueDate] DATETIME2 NULL,  -- Ngày cấp
    [ExpiryDate] DATETIME2 NULL,  -- Ngày hết hạn
    [FrontImagePath] NVARCHAR(MAX) NULL,  -- Đường dẫn ảnh mặt trước giấy tờ
    [BackImagePath] NVARCHAR(MAX) NULL,  -- Đường dẫn ảnh mặt sau giấy tờ
    [VerificationStatus] INT NOT NULL,  -- Trạng thái xác minh (0=Pending, 1=Approved, 2=Rejected)
    [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),  -- Thời gian cập nhật
    [IsActive] BIT NOT NULL,  -- Trạng thái (1=active, 0=deleted)
    -- Foreign key: Khi xóa User thì xóa luôn tất cả giấy tờ của User đó
    CONSTRAINT [FK_IdentityDocuments_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
);
GO

-- Index để tìm nhanh giấy tờ theo UserId
CREATE INDEX [IX_IdentityDocuments_UserId] ON [dbo].[IdentityDocuments]([UserId]);
-- Index để tìm nhanh giấy tờ theo số giấy tờ (dùng cho verification)
CREATE INDEX [IX_IdentityDocuments_DocumentNumber] ON [dbo].[IdentityDocuments]([DocumentNumber]);
GO

-- ============================================
-- BẢNG DRIVINGLICENSES - GIẤY PHÉP LÁI XE
-- ============================================
-- Lưu trữ thông tin giấy phép lái xe của người dùng
-- Một người dùng có thể có nhiều giấy phép (ví dụ: B1, B2, C...)
-- Sử dụng cho KYC verification và kiểm tra quyền lái xe
-- ============================================
CREATE TABLE [dbo].[DrivingLicenses] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_DrivingLicenses] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [UserId] INT NOT NULL,  -- ID người dùng (foreign key đến Users)
    [LicenseNumber] NVARCHAR(50) NOT NULL,  -- Số giấy phép lái xe
    [LicenseClass] NVARCHAR(10) NOT NULL,  -- Hạng giấy phép (B1, B2, C, D, E, F...)
    [FullName] NVARCHAR(200) NOT NULL,  -- Họ tên đầy đủ trên giấy phép
    [DateOfBirth] DATETIME2 NOT NULL,  -- Ngày sinh
    [Address] NVARCHAR(MAX) NULL,  -- Địa chỉ
    [PlaceOfIssue] NVARCHAR(MAX) NULL,  -- Nơi cấp
    [IssueDate] DATETIME2 NOT NULL,  -- Ngày cấp
    [ExpiryDate] DATETIME2 NOT NULL,  -- Ngày hết hạn
    [ImagePath] NVARCHAR(MAX) NULL,  -- Đường dẫn ảnh giấy phép lái xe
    [VerificationStatus] INT NOT NULL,  -- Trạng thái xác minh (0=Pending, 1=Approved, 2=Rejected)
    [Notes] NVARCHAR(MAX) NULL,  -- Ghi chú (nếu có)
    [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),  -- Thời gian tạo
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),  -- Thời gian cập nhật
    [IsActive] BIT NOT NULL,  -- Trạng thái (1=active, 0=deleted)
    -- Foreign key: Khi xóa User thì xóa luôn tất cả giấy phép của User đó
    CONSTRAINT [FK_DrivingLicenses_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
);
GO

-- Index để tìm nhanh giấy phép theo UserId
CREATE INDEX [IX_DrivingLicenses_UserId] ON [dbo].[DrivingLicenses]([UserId]);
-- Index để tìm nhanh giấy phép theo số giấy phép (dùng cho verification)
CREATE INDEX [IX_DrivingLicenses_LicenseNumber] ON [dbo].[DrivingLicenses]([LicenseNumber]);
GO

-- ============================================
-- BẢNG USERROLES - PHÂN QUYỀN NGƯỜI DÙNG
-- ============================================
-- Bảng liên kết many-to-many giữa Users và Roles
-- Một người dùng có thể có nhiều vai trò, một vai trò có thể được gán cho nhiều người dùng
-- Ví dụ: Một người có thể vừa là CoOwner vừa là Admin
-- ============================================
CREATE TABLE [dbo].[UserRoles] (
    [UserId] INT NOT NULL,  -- ID người dùng (foreign key đến Users)
    [RoleId] INT NOT NULL,  -- ID vai trò (foreign key đến Roles)
    [AssignedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),  -- Thời gian gán vai trò
    -- Composite primary key: Một User chỉ có thể có một Role một lần (không trùng lặp)
    CONSTRAINT [PK_UserRoles] PRIMARY KEY ([UserId], [RoleId]),
    -- Foreign key: Khi xóa User thì xóa luôn tất cả vai trò của User đó
    CONSTRAINT [FK_UserRoles_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
    -- Foreign key: Khi xóa Role thì xóa luôn tất cả gán vai trò đó
    CONSTRAINT [FK_UserRoles_Roles] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Roles]([Id]) ON DELETE CASCADE
);
GO

-- Index để tìm nhanh tất cả người dùng có một vai trò cụ thể
CREATE INDEX [IX_UserRoles_RoleId] ON [dbo].[UserRoles]([RoleId]);
GO

-- ============================================
-- BẢNG __EFMIGRATIONSHISTORY - LỊCH SỬ MIGRATION
-- ============================================
-- Bảng đặc biệt của Entity Framework Core để theo dõi các migration đã chạy
-- EF Core sử dụng bảng này để biết migration nào đã được áp dụng
-- Không nên chỉnh sửa bảng này thủ công
-- ============================================
CREATE TABLE [dbo].[__EFMigrationsHistory] (
    [MigrationId] NVARCHAR(150) NOT NULL CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY,  -- Tên migration (ví dụ: 20251111134903_InitialCreate)
    [ProductVersion] NVARCHAR(32) NOT NULL  -- Phiên bản EF Core (ví dụ: 8.0.0)
);
GO

-- Ghi lại migration InitialCreate vào lịch sử
-- Để EF Core biết rằng migration này đã được chạy
IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = N'20251111134903_InitialCreate')
BEGIN
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251111134903_InitialCreate', N'8.0.0');
END
GO

-- ============================================
-- SEED DATA - DỮ LIỆU KHỞI TẠO
-- ============================================
-- Thêm các vai trò mặc định vào hệ thống
-- Chỉ thêm nếu chưa tồn tại (idempotent)
-- ============================================
-- Thêm vai trò CoOwner: Chủ sở hữu đồng sở hữu xe
-- Người dùng có vai trò này có thể đặt xe, xem lịch sử, tham gia bỏ phiếu...
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [Name] = N'CoOwner')
    INSERT INTO [dbo].[Roles] ([Name], [Description]) VALUES (N'CoOwner', N'Chủ sở hữu đồng sở hữu xe');

-- Thêm vai trò Staff: Nhân viên quản lý
-- Người dùng có vai trò này có thể quản lý hệ thống, xác minh KYC, xử lý tranh chấp...
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [Name] = N'Staff')
    INSERT INTO [dbo].[Roles] ([Name], [Description]) VALUES (N'Staff', N'Nhân viên quản lý');

-- Thêm vai trò Admin: Quản trị viên hệ thống
-- Người dùng có vai trò này có toàn quyền quản lý hệ thống
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [Name] = N'Admin')
    INSERT INTO [dbo].[Roles] ([Name], [Description]) VALUES (N'Admin', N'Quản trị viên hệ thống');
GO


