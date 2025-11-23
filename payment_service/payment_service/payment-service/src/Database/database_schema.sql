-- Payment Service Database Schema
-- EV Co-ownership System

USE PaymentServiceDb;
GO

-- Create database if not exists
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PaymentServiceDb')
BEGIN
    CREATE DATABASE PaymentServiceDb;
END
GO

USE PaymentServiceDb;
GO

-- Enable temporal tables
ALTER DATABASE PaymentServiceDb SET TEMPORAL_HISTORY_RETENTION ON;
GO

-- Create schemas
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Payment')
BEGIN
    EXEC('CREATE SCHEMA Payment');
END
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Wallet')
BEGIN
    EXEC('CREATE SCHEMA Wallet');
END
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'CostShare')
BEGIN
    EXEC('CREATE SCHEMA CostShare');
END
GO

-- Create Wallets table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Wallet].[Wallets]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Wallet].[Wallets] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [GroupId] UNIQUEIDENTIFIER NOT NULL,
        [Balance] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [FrozenAmount] DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        [Currency] NVARCHAR(3) NOT NULL DEFAULT 'VND',
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [Version] ROWVERSION NOT NULL,
        
        CONSTRAINT [CK_Wallets_Balance] CHECK ([Balance] >= 0),
        CONSTRAINT [CK_Wallets_FrozenAmount] CHECK ([FrozenAmount] >= 0),
        CONSTRAINT [CK_Wallets_Currency] CHECK ([Currency] IN ('VND', 'USD', 'EUR')),
        
        INDEX [IX_Wallets_UserId] ([UserId]),
        INDEX [IX_Wallets_GroupId] ([GroupId]),
        INDEX [IX_Wallets_UserId_GroupId] ([UserId], [GroupId]),
        UNIQUE ([UserId], [GroupId])
    );
END
GO

-- Create Transactions table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Wallet].[Transactions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Wallet].[Transactions] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [WalletId] UNIQUEIDENTIFIER NOT NULL,
        [Type] INT NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [ReferenceId] UNIQUEIDENTIFIER NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        CONSTRAINT [FK_Transactions_Wallets] FOREIGN KEY ([WalletId]) REFERENCES [Wallet].[Wallets]([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_Transactions_Amount] CHECK ([Amount] > 0),
        CONSTRAINT [CK_Transactions_Type] CHECK ([Type] IN (0, 1, 2, 3, 4)),
        
        INDEX [IX_Transactions_WalletId] ([WalletId]),
        INDEX [IX_Transactions_Type] ([Type]),
        INDEX [IX_Transactions_CreatedAt] ([CreatedAt]),
        INDEX [IX_Transactions_ReferenceId] ([ReferenceId])
    );
END
GO

-- Create CostShares table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[CostShare].[CostShares]') AND type in (N'U'))
BEGIN
    CREATE TABLE [CostShare].[CostShares] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [GroupId] UNIQUEIDENTIFIER NOT NULL,
        [VehicleId] UNIQUEIDENTIFIER NOT NULL,
        [CostType] INT NOT NULL,
        [Title] NVARCHAR(200) NOT NULL,
        [Description] NVARCHAR(1000) NULL,
        [TotalAmount] DECIMAL(18,2) NOT NULL,
        [Currency] NVARCHAR(3) NOT NULL DEFAULT 'VND',
        [DueDate] DATETIME2 NULL,
        [PaidDate] DATETIME2 NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [ReceiptUrl] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [Version] ROWVERSION NOT NULL,
        
        CONSTRAINT [CK_CostShares_TotalAmount] CHECK ([TotalAmount] > 0),
        CONSTRAINT [CK_CostShares_Currency] CHECK ([Currency] IN ('VND', 'USD', 'EUR')),
        CONSTRAINT [CK_CostShares_CostType] CHECK ([CostType] IN (0, 1, 2, 3, 4, 5, 6, 7)),
        CONSTRAINT [CK_CostShares_Status] CHECK ([Status] IN (0, 1, 2)),
        
        INDEX [IX_CostShares_GroupId] ([GroupId]),
        INDEX [IX_CostShares_VehicleId] ([VehicleId]),
        INDEX [IX_CostShares_Status] ([Status]),
        INDEX [IX_CostShares_DueDate] ([DueDate])
    );
END
GO

-- Create CostShareDetails table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[CostShare].[CostShareDetails]') AND type in (N'U'))
BEGIN
    CREATE TABLE [CostShare].[CostShareDetails] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [CostShareId] UNIQUEIDENTIFIER NOT NULL,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [OwnershipPercentage] DECIMAL(5,2) NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [Currency] NVARCHAR(3) NOT NULL DEFAULT 'VND',
        [Status] INT NOT NULL DEFAULT 0,
        [PaidDate] DATETIME2 NULL,
        [Notes] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [Version] ROWVERSION NOT NULL,
        
        CONSTRAINT [FK_CostShareDetails_CostShares] FOREIGN KEY ([CostShareId]) REFERENCES [CostShare].[CostShares]([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_CostShareDetails_OwnershipPercentage] CHECK ([OwnershipPercentage] > 0 AND [OwnershipPercentage] <= 100),
        CONSTRAINT [CK_CostShareDetails_Amount] CHECK ([Amount] > 0),
        CONSTRAINT [CK_CostShareDetails_Currency] CHECK ([Currency] IN ('VND', 'USD', 'EUR')),
        CONSTRAINT [CK_CostShareDetails_Status] CHECK ([Status] IN (0, 1, 2)),
        
        INDEX [IX_CostShareDetails_CostShareId] ([CostShareId]),
        INDEX [IX_CostShareDetails_UserId] ([UserId]),
        INDEX [IX_CostShareDetails_Status] ([Status]),
        UNIQUE ([CostShareId], [UserId])
    );
END
GO

-- Create Payments table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Payment].[Payments]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Payment].[Payments] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [CostShareDetailId] UNIQUEIDENTIFIER NULL,
        [WalletId] UNIQUEIDENTIFIER NOT NULL,
        [Method] INT NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [Currency] NVARCHAR(3) NOT NULL DEFAULT 'VND',
        [Status] INT NOT NULL DEFAULT 0,
        [TransactionId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [ExternalTransactionId] NVARCHAR(100) NULL,
        [PaymentUrl] NVARCHAR(1000) NULL,
        [CallbackUrl] NVARCHAR(500) NULL,
        [ReturnUrl] NVARCHAR(500) NULL,
        [ProcessedAt] DATETIME2 NULL,
        [ErrorMessage] NVARCHAR(1000) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [Version] ROWVERSION NOT NULL,
        
        CONSTRAINT [FK_Payments_CostShareDetails] FOREIGN KEY ([CostShareDetailId]) REFERENCES [CostShare].[CostShareDetails]([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_Payments_Wallets] FOREIGN KEY ([WalletId]) REFERENCES [Wallet].[Wallets]([Id]) ON DELETE CASCADE,
        CONSTRAINT [CK_Payments_Amount] CHECK ([Amount] > 0),
        CONSTRAINT [CK_Payments_Currency] CHECK ([Currency] IN ('VND', 'USD', 'EUR')),
        CONSTRAINT [CK_Payments_Method] CHECK ([Method] IN (0, 1, 2, 3, 4)),
        CONSTRAINT [CK_Payments_Status] CHECK ([Status] IN (0, 1, 2, 3, 4, 5)),
        
        INDEX [IX_Payments_CostShareDetailId] ([CostShareDetailId]),
        INDEX [IX_Payments_WalletId] ([WalletId]),
        INDEX [IX_Payments_Status] ([Status]),
        INDEX [IX_Payments_TransactionId] ([TransactionId]),
        INDEX [IX_Payments_ExternalTransactionId] ([ExternalTransactionId]),
        INDEX [IX_Payments_CreatedAt] ([CreatedAt])
    );
END
GO

-- Create PaymentMethods table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Payment].[PaymentMethods]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Payment].[PaymentMethods] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [MethodType] NVARCHAR(50) NOT NULL,
        [AccountNumber] NVARCHAR(50) NULL,
        [AccountName] NVARCHAR(100) NULL,
        [BankName] NVARCHAR(100) NULL,
        [BankCode] NVARCHAR(10) NULL,
        [IsDefault] BIT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [Version] ROWVERSION NOT NULL,
        
        CONSTRAINT [CK_PaymentMethods_MethodType] CHECK ([MethodType] IN ('Banking', 'EWallet', 'Cash')),
        
        INDEX [IX_PaymentMethods_UserId] ([UserId]),
        INDEX [IX_PaymentMethods_IsDefault] ([IsDefault]),
        INDEX [IX_PaymentMethods_IsActive] ([IsActive])
    );
END
GO

-- Create audit triggers for temporal tables
-- Wallet audit
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Wallet].[WalletsHistory]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Wallet].[WalletsHistory] (
        [Id] UNIQUEIDENTIFIER NOT NULL,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [GroupId] UNIQUEIDENTIFIER NOT NULL,
        [Balance] DECIMAL(18,2) NOT NULL,
        [FrozenAmount] DECIMAL(18,2) NOT NULL,
        [Currency] NVARCHAR(3) NOT NULL,
        [IsActive] BIT NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        [Version] ROWVERSION NOT NULL,
        [ValidFrom] DATETIME2 NOT NULL,
        [ValidTo] DATETIME2 NOT NULL
    );
END
GO

-- Create indexes for performance
CREATE NONCLUSTERED INDEX [IX_WalletsHistory_ValidFrom_ValidTo] ON [Wallet].[WalletsHistory] ([ValidFrom], [ValidTo]);
CREATE NONCLUSTERED INDEX [IX_WalletsHistory_Id] ON [Wallet].[WalletsHistory] ([Id]);

-- Create stored procedures
-- Get wallet balance
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Wallet].[GetWalletBalance]') AND type in (N'P'))
    DROP PROCEDURE [Wallet].[GetWalletBalance];
GO

CREATE PROCEDURE [Wallet].[GetWalletBalance]
    @UserId UNIQUEIDENTIFIER,
    @GroupId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        [Id],
        [UserId],
        [GroupId],
        [Balance],
        [FrozenAmount],
        [Currency],
        [IsActive],
        [CreatedAt],
        [UpdatedAt]
    FROM [Wallet].[Wallets]
    WHERE [UserId] = @UserId 
      AND [GroupId] = @GroupId
      AND [IsActive] = 1;
END
GO

-- Update wallet balance
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Wallet].[UpdateWalletBalance]') AND type in (N'P'))
    DROP PROCEDURE [Wallet].[UpdateWalletBalance];
GO

CREATE PROCEDURE [Wallet].[UpdateWalletBalance]
    @WalletId UNIQUEIDENTIFIER,
    @Amount DECIMAL(18,2),
    @TransactionType INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Update wallet balance
        UPDATE [Wallet].[Wallets]
        SET [Balance] = [Balance] + @Amount,
            [UpdatedAt] = GETUTCDATE()
        WHERE [Id] = @WalletId;
        
        -- Create transaction record
        INSERT INTO [Wallet].[Transactions] (
            [WalletId], [Type], [Amount], [CreatedAt]
        )
        VALUES (
            @WalletId, @TransactionType, @Amount, GETUTCDATE()
        );
        
        COMMIT TRANSACTION;
        SELECT 1 AS Success;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS ErrorMessage;
    END CATCH
END
GO

-- Get cost shares by group
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[CostShare].[GetCostSharesByGroup]') AND type in (N'P'))
    DROP PROCEDURE [CostShare].[GetCostSharesByGroup];
GO

CREATE PROCEDURE [CostShare].[GetCostSharesByGroup]
    @GroupId UNIQUEIDENTIFIER,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    
    SELECT 
        cs.[Id],
        cs.[GroupId],
        cs.[VehicleId],
        cs.[CostType],
        cs.[Title],
        cs.[Description],
        cs.[TotalAmount],
        cs.[Currency],
        cs.[DueDate],
        cs.[PaidDate],
        cs.[Status],
        cs.[ReceiptUrl],
        cs.[CreatedAt],
        cs.[UpdatedAt]
    FROM [CostShare].[CostShares] cs
    WHERE cs.[GroupId] = @GroupId
    ORDER BY cs.[CreatedAt] DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- Create views for reporting
-- Wallet summary view
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[Wallet].[WalletSummary]'))
    DROP VIEW [Wallet].[WalletSummary];
GO

CREATE VIEW [Wallet].[WalletSummary]
AS
SELECT 
    w.[Id],
    w.[UserId],
    w.[GroupId],
    w.[Balance],
    w.[FrozenAmount],
    w.[Currency],
    w.[IsActive],
    ISNULL(SUM(t.[Amount]), 0) AS [TotalTransactions],
    COUNT(t.[Id]) AS [TransactionCount],
    w.[CreatedAt],
    w.[UpdatedAt]
FROM [Wallet].[Wallets] w
LEFT JOIN [Wallet].[Transactions] t ON w.[Id] = t.[WalletId]
GROUP BY w.[Id], w.[UserId], w.[GroupId], w.[Balance], w.[FrozenAmount], w.[Currency], w.[IsActive], w.[CreatedAt], w.[UpdatedAt];
GO

-- Payment summary view
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[Payment].[PaymentSummary]'))
    DROP VIEW [Payment].[PaymentSummary];
GO

CREATE VIEW [Payment].[PaymentSummary]
AS
SELECT 
    p.[Id],
    p.[WalletId],
    p.[Method],
    p.[Amount],
    p.[Currency],
    p.[Status],
    p.[TransactionId],
    p.[ExternalTransactionId],
    p.[ProcessedAt],
    p.[CreatedAt],
    w.[UserId],
    w.[GroupId]
FROM [Payment].[Payments] p
INNER JOIN [Wallet].[Wallets] w ON p.[WalletId] = w.[Id];
GO

-- Create functions
-- Calculate cost share amount
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[CostShare].[CalculateCostShareAmount]') AND type in (N'FN'))
    DROP FUNCTION [CostShare].[CalculateCostShareAmount];
GO

CREATE FUNCTION [CostShare].[CalculateCostShareAmount] (
    @TotalAmount DECIMAL(18,2),
    @OwnershipPercentage DECIMAL(5,2)
)
RETURNS DECIMAL(18,2)
AS
BEGIN
    RETURN (@TotalAmount * @OwnershipPercentage / 100);
END
GO

-- Create constraints and checks
-- Ensure total ownership percentage doesn't exceed 100%
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_CostShareDetails_TotalOwnership')
BEGIN
    ALTER TABLE [CostShare].[CostShareDetails]
    ADD CONSTRAINT [CK_CostShareDetails_TotalOwnership] 
    CHECK (
        (SELECT SUM([OwnershipPercentage]) 
         FROM [CostShare].[CostShareDetails] csd2 
         WHERE csd2.[CostShareId] = [CostShareDetails].[CostShareId]) <= 100
    );
END
GO

-- Create full-text search indexes
IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'PaymentServiceCatalog')
BEGIN
    CREATE FULLTEXT CATALOG [PaymentServiceCatalog];
END
GO

-- Add full-text indexes
IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID(N'[CostShare].[CostShares]'))
BEGIN
    CREATE FULLTEXT INDEX ON [CostShare].[CostShares]([Title], [Description])
    KEY INDEX [PK_CostShares] ON [PaymentServiceCatalog];
END
GO

-- Create security roles
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'PaymentServiceApp')
BEGIN
    CREATE ROLE [PaymentServiceApp];
END
GO

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[Wallet] TO [PaymentServiceApp];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[Payment] TO [PaymentServiceApp];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[CostShare] TO [PaymentServiceApp];
GRANT EXECUTE ON SCHEMA::[Wallet] TO [PaymentServiceApp];
GRANT EXECUTE ON SCHEMA::[Payment] TO [PaymentServiceApp];
GRANT EXECUTE ON SCHEMA::[CostShare] TO [PaymentServiceApp];

-- Create maintenance procedures
-- Cleanup old transactions
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CleanupOldTransactions]') AND type in (N'P'))
    DROP PROCEDURE [dbo].[CleanupOldTransactions];
GO

CREATE PROCEDURE [dbo].[CleanupOldTransactions]
    @RetentionDays INT = 365
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CutoffDate DATETIME2 = DATEADD(DAY, -@RetentionDays, GETUTCDATE());
    
    -- Archive old transactions
    INSERT INTO [Wallet].[Transactions] (
        [Id], [WalletId], [Type], [Amount], [Description], [ReferenceId], [CreatedAt]
    )
    SELECT 
        [Id], [WalletId], [Type], [Amount], [Description], [ReferenceId], [CreatedAt]
    FROM [Wallet].[Transactions]
    WHERE [CreatedAt] < @CutoffDate;
    
    -- Delete old transactions
    DELETE FROM [Wallet].[Transactions]
    WHERE [CreatedAt] < @CutoffDate;
    
    SELECT @@ROWCOUNT AS [DeletedRows];
END
GO

-- Performance monitoring
-- Create index usage statistics view
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[IndexUsageStats]'))
    DROP VIEW [dbo].[IndexUsageStats];
GO

CREATE VIEW [dbo].[IndexUsageStats]
AS
SELECT 
    OBJECT_NAME(i.object_id) AS [TableName],
    i.name AS [IndexName],
    i.type_desc AS [IndexType],
    s.user_seeks,
    s.user_scans,
    s.user_lookups,
    s.user_updates,
    s.last_user_seek,
    s.last_user_scan,
    s.last_user_lookup,
    s.last_user_update
FROM sys.dm_db_index_usage_stats s
INNER JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE s.database_id = DB_ID();
GO

PRINT 'Payment Service Database Schema Created Successfully!';
