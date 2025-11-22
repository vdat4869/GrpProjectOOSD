-- Disputes table schema
USE [ownership_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Create Disputes table if not exists
IF OBJECT_ID(N'[dbo].[Disputes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Disputes] (
        [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Disputes] PRIMARY KEY,
        [Type] NVARCHAR(50) NOT NULL,
        [Title] NVARCHAR(200) NOT NULL,
        [Description] NVARCHAR(1000) NOT NULL,
        [Severity] NVARCHAR(20) NOT NULL DEFAULT('medium'),
        [RelatedId] NVARCHAR(100) NOT NULL,
        [RelatedType] NVARCHAR(50) NOT NULL,
        [Status] INT NOT NULL DEFAULT(1),
        [Notes] NVARCHAR(1000) NULL,
        [ResolvedBy] NVARCHAR(100) NULL,
        [ResolvedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
    );
    
    CREATE INDEX [IX_Disputes_Status] ON [dbo].[Disputes]([Status]);
    CREATE INDEX [IX_Disputes_Type] ON [dbo].[Disputes]([Type]);
    CREATE INDEX [IX_Disputes_RelatedType] ON [dbo].[Disputes]([RelatedType]);
    CREATE INDEX [IX_Disputes_RelatedType_RelatedId] ON [dbo].[Disputes]([RelatedType], [RelatedId]);
    
    PRINT 'Disputes table created successfully.';
END
ELSE
BEGIN
    PRINT 'Disputes table already exists.';
END
GO
