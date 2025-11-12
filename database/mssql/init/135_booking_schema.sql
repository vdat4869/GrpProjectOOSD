-- Booking DB schema (idempotent)
USE [booking_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'[dbo].[Bookings]', N'U') IS NOT NULL DROP TABLE [dbo].[Bookings];
IF OBJECT_ID(N'[dbo].[CoOwners]', N'U') IS NOT NULL DROP TABLE [dbo].[CoOwners];
IF OBJECT_ID(N'[dbo].[Vehicles]', N'U') IS NOT NULL DROP TABLE [dbo].[Vehicles];
GO

CREATE TABLE [dbo].[Vehicles] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Vehicles] PRIMARY KEY,
    [Name] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL DEFAULT(1)
);
GO

CREATE TABLE [dbo].[CoOwners] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_CoOwners] PRIMARY KEY,
    [Name] NVARCHAR(100) NOT NULL,
    [OwnershipRatio] DECIMAL(5,2) NOT NULL,
    [UsageCount] INT NOT NULL DEFAULT(0)
);
GO

CREATE TABLE [dbo].[Bookings] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Bookings] PRIMARY KEY,
    [VehicleId] INT NOT NULL,
    [CoOwnerId] INT NOT NULL,
    [StartTime] DATETIME2 NOT NULL,
    [EndTime] DATETIME2 NOT NULL,
    [Status] NVARCHAR(20) NOT NULL DEFAULT(N'Pending'),
    [Note] NVARCHAR(255) NULL,
    [DistanceKm] DECIMAL(10,2) NULL,
    [Cost] DECIMAL(18,2) NULL,
    [CheckInTime] DATETIME2 NULL,
    [CheckOutTime] DATETIME2 NULL,
    [QrCode] NVARCHAR(500) NULL,
    [DigitalSignature] NVARCHAR(1000) NULL,
    CONSTRAINT [FK_Bookings_Vehicles] FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicles]([Id]) ON DELETE CASCADE,
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


