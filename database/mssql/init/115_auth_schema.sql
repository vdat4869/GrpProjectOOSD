-- Auth DB detailed schema (idempotent)
-- Requires database 'auth_db'
USE [auth_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Drop existing tables to align schema with EF model
IF OBJECT_ID(N'[dbo].[UserRoles]', N'U') IS NOT NULL DROP TABLE [dbo].[UserRoles];
IF OBJECT_ID(N'[dbo].[DrivingLicenses]', N'U') IS NOT NULL DROP TABLE [dbo].[DrivingLicenses];
IF OBJECT_ID(N'[dbo].[IdentityDocuments]', N'U') IS NOT NULL DROP TABLE [dbo].[IdentityDocuments];
IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL DROP TABLE [dbo].[Users];
IF OBJECT_ID(N'[dbo].[Roles]', N'U') IS NOT NULL DROP TABLE [dbo].[Roles];
IF OBJECT_ID(N'[dbo].[__EFMigrationsHistory]', N'U') IS NOT NULL DROP TABLE [dbo].[__EFMigrationsHistory];
GO

CREATE TABLE [dbo].[Roles] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Roles] PRIMARY KEY,
    [Name] NVARCHAR(50) NOT NULL,
    [Description] NVARCHAR(255) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
);
GO

CREATE UNIQUE INDEX [IX_Roles_Name] ON [dbo].[Roles]([Name]);
GO

CREATE TABLE [dbo].[Users] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Users] PRIMARY KEY,
    [Email] NVARCHAR(255) NOT NULL,
    [PasswordHash] NVARCHAR(255) NOT NULL,
    [FirstName] NVARCHAR(100) NOT NULL,
    [LastName] NVARCHAR(100) NOT NULL,
    [PhoneNumber] NVARCHAR(20) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    [IsActive] BIT NOT NULL DEFAULT(1),
    [RefreshToken] NVARCHAR(MAX) NULL,
    [RefreshTokenExpiryTime] DATETIME2 NULL
);
GO

CREATE UNIQUE INDEX [IX_Users_Email] ON [dbo].[Users]([Email]);
GO

CREATE TABLE [dbo].[IdentityDocuments] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_IdentityDocuments] PRIMARY KEY,
    [UserId] INT NOT NULL,
    [DocumentType] INT NOT NULL,
    [DocumentNumber] NVARCHAR(50) NOT NULL,
    [FullName] NVARCHAR(200) NOT NULL,
    [DateOfBirth] DATETIME2 NOT NULL,
    [Gender] NVARCHAR(MAX) NULL,
    [Nationality] NVARCHAR(MAX) NULL,
    [PlaceOfIssue] NVARCHAR(MAX) NULL,
    [IssueDate] DATETIME2 NULL,
    [ExpiryDate] DATETIME2 NULL,
    [FrontImagePath] NVARCHAR(MAX) NULL,
    [BackImagePath] NVARCHAR(MAX) NULL,
    [VerificationStatus] INT NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    [IsActive] BIT NOT NULL,
    CONSTRAINT [FK_IdentityDocuments_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_IdentityDocuments_UserId] ON [dbo].[IdentityDocuments]([UserId]);
CREATE INDEX [IX_IdentityDocuments_DocumentNumber] ON [dbo].[IdentityDocuments]([DocumentNumber]);
GO

CREATE TABLE [dbo].[DrivingLicenses] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_DrivingLicenses] PRIMARY KEY,
    [UserId] INT NOT NULL,
    [LicenseNumber] NVARCHAR(50) NOT NULL,
    [LicenseClass] NVARCHAR(10) NOT NULL,
    [FullName] NVARCHAR(200) NOT NULL,
    [DateOfBirth] DATETIME2 NOT NULL,
    [Address] NVARCHAR(MAX) NULL,
    [PlaceOfIssue] NVARCHAR(MAX) NULL,
    [IssueDate] DATETIME2 NOT NULL,
    [ExpiryDate] DATETIME2 NOT NULL,
    [ImagePath] NVARCHAR(MAX) NULL,
    [VerificationStatus] INT NOT NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    [IsActive] BIT NOT NULL,
    CONSTRAINT [FK_DrivingLicenses_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_DrivingLicenses_UserId] ON [dbo].[DrivingLicenses]([UserId]);
CREATE INDEX [IX_DrivingLicenses_LicenseNumber] ON [dbo].[DrivingLicenses]([LicenseNumber]);
GO

CREATE TABLE [dbo].[UserRoles] (
    [UserId] INT NOT NULL,
    [RoleId] INT NOT NULL,
    [AssignedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_UserRoles] PRIMARY KEY ([UserId], [RoleId]),
    CONSTRAINT [FK_UserRoles_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserRoles_Roles] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Roles]([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_UserRoles_RoleId] ON [dbo].[UserRoles]([RoleId]);
GO

CREATE TABLE [dbo].[__EFMigrationsHistory] (
    [MigrationId] NVARCHAR(150) NOT NULL CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY,
    [ProductVersion] NVARCHAR(32) NOT NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = N'20251111134903_InitialCreate')
BEGIN
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251111134903_InitialCreate', N'8.0.0');
END
GO

-- Seed base roles
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [Name] = N'CoOwner')
    INSERT INTO [dbo].[Roles] ([Name], [Description]) VALUES (N'CoOwner', N'Chủ sở hữu đồng sở hữu xe');
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [Name] = N'Staff')
    INSERT INTO [dbo].[Roles] ([Name], [Description]) VALUES (N'Staff', N'Nhân viên quản lý');
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [Name] = N'Admin')
    INSERT INTO [dbo].[Roles] ([Name], [Description]) VALUES (N'Admin', N'Quản trị viên hệ thống');
GO


