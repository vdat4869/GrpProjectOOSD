-- Report DB schema (idempotent, aligns with EF Core models)
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

CREATE TABLE [dbo].[UsageHistories] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_UsageHistories] PRIMARY KEY,
    [VehicleId] INT NOT NULL,
    [CoOwnerId] INT NOT NULL,
    [StartTime] DATETIME2 NOT NULL,
    [EndTime] DATETIME2 NOT NULL,
    [StartLocation] NVARCHAR(255) NULL,
    [EndLocation] NVARCHAR(255) NULL,
    [DistanceKm] DECIMAL(10,2) NOT NULL,
    [StartBatteryLevel] DECIMAL(5,2) NOT NULL,
    [EndBatteryLevel] DECIMAL(5,2) NOT NULL,
    [EnergyConsumed] DECIMAL(10,2) NOT NULL,
    [Cost] DECIMAL(18,2) NOT NULL,
    [Purpose] NVARCHAR(255) NULL,
    [Notes] NVARCHAR(500) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [IsActive] BIT NOT NULL DEFAULT(1)
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
