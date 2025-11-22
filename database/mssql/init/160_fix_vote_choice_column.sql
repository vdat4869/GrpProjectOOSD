-- Migration script to fix Vote.Choice column from BIT to INT
-- This script will recreate the Votes table with correct schema if it doesn't match
USE [ownership_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Check if Votes table exists and has correct schema
DECLARE @HasCorrectSchema BIT = 0;
DECLARE @HasChoiceColumn BIT = 0;
DECLARE @ChoiceIsInt BIT = 0;
DECLARE @ChoiceDataType NVARCHAR(50) = NULL;

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Votes')
BEGIN
    -- Check if Choice column exists and get its data type
    IF EXISTS (
        SELECT 1 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Votes' 
        AND COLUMN_NAME = 'Choice'
    )
    BEGIN
        SET @HasChoiceColumn = 1;
        
        -- Get the actual data type
        SELECT @ChoiceDataType = DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Votes' 
        AND COLUMN_NAME = 'Choice';
        
        -- Check if Choice is INT
        IF @ChoiceDataType = 'int'
        BEGIN
            SET @ChoiceIsInt = 1;
        END
    END
    
    -- Check if table has correct columns (Guid IDs, CoOwnerId, etc.)
    IF EXISTS (
        SELECT 1 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Votes' 
        AND COLUMN_NAME = 'Id'
        AND DATA_TYPE = 'uniqueidentifier'
    )
    AND EXISTS (
        SELECT 1 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Votes' 
        AND COLUMN_NAME = 'CoOwnerId'
    )
    AND EXISTS (
        SELECT 1 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Votes' 
        AND COLUMN_NAME = 'VotedAt'
    )
    BEGIN
        SET @HasCorrectSchema = 1;
    END
END

-- If table doesn't exist or has wrong schema, recreate it
IF @HasCorrectSchema = 0
BEGIN
    PRINT 'Votes table has incorrect schema. Recreating table...';
    
    -- Drop foreign key constraints first
    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('[dbo].[Votes]'))
    BEGIN
        DECLARE @FKName NVARCHAR(128);
        DECLARE @SQL NVARCHAR(MAX);
        
        DECLARE FK_Cursor CURSOR FOR
        SELECT name FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('[dbo].[Votes]');
        
        OPEN FK_Cursor;
        FETCH NEXT FROM FK_Cursor INTO @FKName;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @SQL = 'ALTER TABLE [dbo].[Votes] DROP CONSTRAINT [' + @FKName + ']';
            EXEC sp_executesql @SQL;
            FETCH NEXT FROM FK_Cursor INTO @FKName;
        END
        
        CLOSE FK_Cursor;
        DEALLOCATE FK_Cursor;
    END
    
    -- Drop indexes
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('[dbo].[Votes]'))
    BEGIN
        DROP INDEX IF EXISTS [IX_Votes_ProposalId_CoOwnerId] ON [dbo].[Votes];
        DROP INDEX IF EXISTS [IX_Votes_ProposalId] ON [dbo].[Votes];
        DROP INDEX IF EXISTS [IX_Votes_CoOwnerId] ON [dbo].[Votes];
    END
    
    -- Drop table
    DROP TABLE IF EXISTS [dbo].[Votes];
    
    -- Create table with correct schema
    CREATE TABLE [dbo].[Votes] (
        [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Votes] PRIMARY KEY,
        [ProposalId] UNIQUEIDENTIFIER NOT NULL,
        [CoOwnerId] UNIQUEIDENTIFIER NOT NULL,
        [Choice] INT NOT NULL,
        [Comment] NVARCHAR(500) NULL,
        [VotedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
        [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
    );
    
    -- Create indexes
    CREATE UNIQUE INDEX [IX_Votes_ProposalId_CoOwnerId] ON [dbo].[Votes]([ProposalId], [CoOwnerId]);
    CREATE INDEX [IX_Votes_ProposalId] ON [dbo].[Votes]([ProposalId]);
    CREATE INDEX [IX_Votes_CoOwnerId] ON [dbo].[Votes]([CoOwnerId]);
    
    -- Add foreign key constraints
    ALTER TABLE [dbo].[Votes] WITH CHECK
        ADD CONSTRAINT [FK_Votes_Proposals]
        FOREIGN KEY ([ProposalId]) REFERENCES [dbo].[Proposals]([Id]) ON DELETE CASCADE;
    
    ALTER TABLE [dbo].[Votes] WITH CHECK
        ADD CONSTRAINT [FK_Votes_CoOwners]
        FOREIGN KEY ([CoOwnerId]) REFERENCES [dbo].[CoOwners]([Id]) ON DELETE NO ACTION;
    
    -- Add default constraint
    ALTER TABLE [dbo].[Votes] 
        ADD CONSTRAINT [DF_Votes_Choice] DEFAULT 1 FOR [Choice];
    
    PRINT 'Votes table recreated with correct schema (Choice as INT).';
END
ELSE IF @HasChoiceColumn = 1 AND @ChoiceIsInt = 0
BEGIN
    -- Choice column exists but is not INT, convert it
    PRINT 'Converting Vote.Choice column from BIT to INT...';
    
    -- Check if ChoiceTemp already exists (from previous failed run)
    IF EXISTS (
        SELECT 1 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Votes' 
        AND COLUMN_NAME = 'ChoiceTemp'
    )
    BEGIN
        -- ChoiceTemp exists, check if Choice still exists
        IF EXISTS (
            SELECT 1 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Votes' 
            AND COLUMN_NAME = 'Choice'
        )
        BEGIN
            -- Both exist, convert data
            IF EXISTS (SELECT 1 FROM [dbo].[Votes])
            BEGIN
                UPDATE [dbo].[Votes] 
                SET [ChoiceTemp] = CASE 
                    WHEN [Choice] = 1 THEN 1  -- Approve
                    WHEN [Choice] = 0 THEN 2  -- Reject
                    ELSE 1  -- Default to Approve if NULL
                END;
                PRINT 'Converted existing vote data.';
            END
            
            -- Drop old column
            ALTER TABLE [dbo].[Votes] DROP COLUMN [Choice];
            PRINT 'Dropped old Choice column.';
        END
        
        -- Rename ChoiceTemp to Choice
        IF EXISTS (
            SELECT 1 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Votes' 
            AND COLUMN_NAME = 'ChoiceTemp'
        )
        AND NOT EXISTS (
            SELECT 1 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Votes' 
            AND COLUMN_NAME = 'Choice'
        )
        BEGIN
            EXEC sp_rename '[dbo].[Votes].[ChoiceTemp]', 'Choice', 'COLUMN';
            PRINT 'Renamed ChoiceTemp to Choice.';
        END
    END
    ELSE
    BEGIN
        -- ChoiceTemp doesn't exist, add it
        ALTER TABLE [dbo].[Votes] ADD [ChoiceTemp] INT NULL;
        PRINT 'Added temporary ChoiceTemp column.';
        
        -- Convert existing data (only if there are rows)
        IF EXISTS (SELECT 1 FROM [dbo].[Votes])
        BEGIN
            UPDATE [dbo].[Votes] 
            SET [ChoiceTemp] = CASE 
                WHEN [Choice] = 1 THEN 1  -- Approve
                WHEN [Choice] = 0 THEN 2  -- Reject
                ELSE 1  -- Default to Approve if NULL
            END;
            PRINT 'Converted existing vote data.';
        END
        
        -- Drop old column
        ALTER TABLE [dbo].[Votes] DROP COLUMN [Choice];
        PRINT 'Dropped old Choice column.';
        
        -- Rename new column
        EXEC sp_rename '[dbo].[Votes].[ChoiceTemp]', 'Choice', 'COLUMN';
        PRINT 'Renamed ChoiceTemp to Choice.';
    END
    
    -- Make it NOT NULL
    ALTER TABLE [dbo].[Votes] ALTER COLUMN [Choice] INT NOT NULL;
    PRINT 'Set Choice column to NOT NULL.';
    
    -- Add default constraint if not exists
    IF NOT EXISTS (
        SELECT 1 
        FROM sys.default_constraints 
        WHERE parent_object_id = OBJECT_ID('[dbo].[Votes]') 
        AND name = 'DF_Votes_Choice'
    )
    BEGIN
        ALTER TABLE [dbo].[Votes] 
        ADD CONSTRAINT [DF_Votes_Choice] DEFAULT 1 FOR [Choice];
        PRINT 'Added default constraint for Choice column.';
    END
    
    PRINT 'Vote.Choice column has been successfully converted from BIT to INT.';
END
ELSE
BEGIN
    PRINT 'Vote.Choice column is already INT. No migration needed.';
END
GO

-- Verify the change
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Votes' AND COLUMN_NAME = 'Choice';
GO
