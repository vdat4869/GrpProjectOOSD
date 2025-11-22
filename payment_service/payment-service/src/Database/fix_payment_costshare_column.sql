-- Fix Payment table: Rename CostShareId to CostShareDetailId if exists
-- This script fixes the database schema mismatch

USE PaymentServiceDb;
GO

-- Check if CostShareId column exists and rename it to CostShareDetailId
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[Payment].[Payments]') 
    AND name = 'CostShareId'
)
BEGIN
    -- Check if CostShareDetailId already exists
    IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'[Payment].[Payments]') 
        AND name = 'CostShareDetailId'
    )
    BEGIN
        -- Rename the column
        EXEC sp_rename '[Payment].[Payments].[CostShareId]', 'CostShareDetailId', 'COLUMN';
        PRINT 'Column CostShareId renamed to CostShareDetailId successfully.';
    END
    ELSE
    BEGIN
        -- If both columns exist, drop the old one (after migrating data if needed)
        PRINT 'Both CostShareId and CostShareDetailId exist. Please manually migrate data and drop CostShareId.';
    END
END
ELSE IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[Payment].[Payments]') 
    AND name = 'CostShareDetailId'
)
BEGIN
    -- Add CostShareDetailId column if it doesn't exist
    ALTER TABLE [Payment].[Payments]
    ADD [CostShareDetailId] UNIQUEIDENTIFIER NULL;
    
    PRINT 'Column CostShareDetailId added successfully.';
END
ELSE
BEGIN
    PRINT 'Column CostShareDetailId already exists. No changes needed.';
END
GO

-- Update foreign key constraint if needed
IF EXISTS (
    SELECT * FROM sys.foreign_keys 
    WHERE name = 'FK_Payments_CostShareDetails'
    AND parent_object_id = OBJECT_ID(N'[Payment].[Payments]')
)
BEGIN
    -- Foreign key already exists, check if it references the correct column
    PRINT 'Foreign key FK_Payments_CostShareDetails already exists.';
END
ELSE
BEGIN
    -- Add foreign key constraint
    ALTER TABLE [Payment].[Payments]
    ADD CONSTRAINT [FK_Payments_CostShareDetails] 
    FOREIGN KEY ([CostShareDetailId]) 
    REFERENCES [CostShare].[CostShareDetails]([Id]) 
    ON DELETE SET NULL;
    
    PRINT 'Foreign key FK_Payments_CostShareDetails added successfully.';
END
GO

-- Create index if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_Payments_CostShareDetailId' 
    AND object_id = OBJECT_ID(N'[Payment].[Payments]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Payments_CostShareDetailId] 
    ON [Payment].[Payments]([CostShareDetailId]);
    
    PRINT 'Index IX_Payments_CostShareDetailId created successfully.';
END
ELSE
BEGIN
    PRINT 'Index IX_Payments_CostShareDetailId already exists.';
END
GO

PRINT 'Payment table schema fix completed!';
GO

