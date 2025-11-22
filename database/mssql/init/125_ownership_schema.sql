-- Ownership DB schema (idempotent, aligns with EF Core models)
USE [ownership_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Reset tables so the schema matches the current codebase
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

CREATE TABLE [dbo].[CoOwners] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_CoOwners] PRIMARY KEY,
    [UserId] NVARCHAR(100) NOT NULL,
    [FullName] NVARCHAR(200) NOT NULL,
    [IdentityCardNumber] NVARCHAR(20) NOT NULL,
    [DrivingLicenseNumber] NVARCHAR(20) NULL,
    [Email] NVARCHAR(100) NOT NULL,
    [PhoneNumber] NVARCHAR(15) NULL,
    [Address] NVARCHAR(500) NULL,
    [IsVerified] BIT NOT NULL DEFAULT(0),
    [VerifiedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
);
GO

CREATE UNIQUE INDEX [IX_CoOwners_UserId] ON [dbo].[CoOwners]([UserId]);
CREATE UNIQUE INDEX [IX_CoOwners_Email] ON [dbo].[CoOwners]([Email]);
CREATE UNIQUE INDEX [IX_CoOwners_IdentityCardNumber] ON [dbo].[CoOwners]([IdentityCardNumber]);
CREATE INDEX [IX_CoOwners_DrivingLicenseNumber] ON [dbo].[CoOwners]([DrivingLicenseNumber]);
GO

CREATE TABLE [dbo].[VehicleGroups] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_VehicleGroups] PRIMARY KEY,
    [Name] NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(1000) NULL,
    [VehicleName] NVARCHAR(50) NOT NULL,
    [LicensePlate] NVARCHAR(20) NULL,
    [VehicleModel] NVARCHAR(50) NULL,
    [VehicleYear] NVARCHAR(20) NULL,
    [CreatedByCoOwnerId] UNIQUEIDENTIFIER NULL,
    [Status] INT NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
);
GO

CREATE INDEX [IX_VehicleGroups_Name] ON [dbo].[VehicleGroups]([Name]);
CREATE INDEX [IX_VehicleGroups_Status] ON [dbo].[VehicleGroups]([Status]);
GO

CREATE TABLE [dbo].[Ownerships] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Ownerships] PRIMARY KEY,
    [CoOwnerId] UNIQUEIDENTIFIER NOT NULL,
    [VehicleGroupId] UNIQUEIDENTIFIER NOT NULL,
    [OwnershipPercentage] DECIMAL(5,2) NOT NULL,
    [StartDate] DATETIME2 NOT NULL,
    [EndDate] DATETIME2 NULL,
    [IsActive] BIT NOT NULL,
    [Notes] NVARCHAR(1000) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
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

CREATE TABLE [dbo].[GroupFunds] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_GroupFunds] PRIMARY KEY,
    [VehicleGroupId] UNIQUEIDENTIFIER NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(500) NULL,
    [Balance] DECIMAL(18,2) NOT NULL,
    [Currency] NVARCHAR(3) NOT NULL,
    [Status] INT NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
);
GO

CREATE INDEX [IX_GroupFunds_VehicleGroupId] ON [dbo].[GroupFunds]([VehicleGroupId]);
CREATE INDEX [IX_GroupFunds_Status] ON [dbo].[GroupFunds]([Status]);
GO

CREATE TABLE [dbo].[FundTransactions] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_FundTransactions] PRIMARY KEY,
    [GroupFundId] UNIQUEIDENTIFIER NOT NULL,
    [CoOwnerId] UNIQUEIDENTIFIER NOT NULL,
    [Type] INT NOT NULL,
    [Amount] DECIMAL(18,2) NOT NULL,
    [Currency] NVARCHAR(3) NOT NULL,
    [Description] NVARCHAR(500) NULL,
    [Category] NVARCHAR(200) NULL,
    [ReceiptNumber] NVARCHAR(100) NULL,
    [ReceiptImageUrl] NVARCHAR(500) NULL,
    [Status] INT NOT NULL,
    [ApprovedByCoOwnerId] UNIQUEIDENTIFIER NULL,
    [ApprovedAt] DATETIME2 NULL,
    [TransactionDate] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
);
GO

CREATE INDEX [IX_FundTransactions_GroupFundId] ON [dbo].[FundTransactions]([GroupFundId]);
CREATE INDEX [IX_FundTransactions_CoOwnerId] ON [dbo].[FundTransactions]([CoOwnerId]);
CREATE INDEX [IX_FundTransactions_Type] ON [dbo].[FundTransactions]([Type]);
CREATE INDEX [IX_FundTransactions_Status] ON [dbo].[FundTransactions]([Status]);
CREATE INDEX [IX_FundTransactions_TransactionDate] ON [dbo].[FundTransactions]([TransactionDate]);
GO

CREATE TABLE [dbo].[Proposals] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Proposals] PRIMARY KEY,
    [VehicleGroupId] UNIQUEIDENTIFIER NOT NULL,
    [CreatedByCoOwnerId] UNIQUEIDENTIFIER NOT NULL,
    [Title] NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(2000) NULL,
    [Type] INT NOT NULL,
    [Details] NVARCHAR(1000) NULL,
    [EstimatedCost] DECIMAL(18,2) NULL,
    [Currency] NVARCHAR(3) NULL,
    [Status] INT NOT NULL,
    [VotingStartDate] DATETIME2 NULL,
    [VotingEndDate] DATETIME2 NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
);
GO

CREATE INDEX [IX_Proposals_VehicleGroupId] ON [dbo].[Proposals]([VehicleGroupId]);
CREATE INDEX [IX_Proposals_CreatedByCoOwnerId] ON [dbo].[Proposals]([CreatedByCoOwnerId]);
CREATE INDEX [IX_Proposals_Type] ON [dbo].[Proposals]([Type]);
CREATE INDEX [IX_Proposals_Status] ON [dbo].[Proposals]([Status]);
GO

CREATE TABLE [dbo].[Votes] (
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Votes] PRIMARY KEY,
    [ProposalId] UNIQUEIDENTIFIER NOT NULL,
    [CoOwnerId] UNIQUEIDENTIFIER NOT NULL,
    [Choice] INT NOT NULL,
    [Comment] NVARCHAR(500) NULL,
    [VotedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
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

