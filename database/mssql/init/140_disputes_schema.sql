-- ============================================
-- SCHEMA BẢNG DISPUTES - TRANH CHẤP
-- ============================================
-- File này tạo bảng Disputes trong database ownership_db
-- Bảng này lưu trữ các tranh chấp giữa các chủ sở hữu hoặc liên quan đến nhóm xe
-- 
-- Các loại tranh chấp:
-- - Ownership: Tranh chấp về quyền sở hữu
-- - Payment: Tranh chấp về thanh toán
-- - Booking: Tranh chấp về đặt xe
-- - Maintenance: Tranh chấp về bảo trì
-- - Proposal: Tranh chấp về đề xuất
--
-- Mức độ nghiêm trọng:
-- - Low: Thấp
-- - Medium: Trung bình
-- - High: Cao
-- - Critical: Nghiêm trọng
--
-- Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

USE [ownership_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================
-- TẠO BẢNG DISPUTES (NẾU CHƯA TỒN TẠI)
-- ============================================
IF OBJECT_ID(N'[dbo].[Disputes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Disputes] (
        [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Disputes] PRIMARY KEY,  -- ID duy nhất (GUID)
        [Type] NVARCHAR(50) NOT NULL,  -- Loại tranh chấp (Ownership, Payment, Booking, Maintenance, Proposal...)
        [Title] NVARCHAR(200) NOT NULL,  -- Tiêu đề tranh chấp
        [Description] NVARCHAR(1000) NOT NULL,  -- Mô tả chi tiết tranh chấp
        [Severity] NVARCHAR(20) NOT NULL DEFAULT('medium'),  -- Mức độ nghiêm trọng (low, medium, high, critical)
        [RelatedId] NVARCHAR(100) NOT NULL,  -- ID đối tượng liên quan (VehicleGroupId, BookingId, PaymentId...)
        [RelatedType] NVARCHAR(50) NOT NULL,  -- Loại đối tượng liên quan (VehicleGroup, Booking, Payment...)
        [Status] INT NOT NULL DEFAULT(1),  -- Trạng thái (0=Closed, 1=Open, 2=InProgress, 3=Resolved)
        [Notes] NVARCHAR(1000) NULL,  -- Ghi chú bổ sung
        [ResolvedBy] NVARCHAR(100) NULL,  -- ID người giải quyết (Staff/Admin)
        [ResolvedAt] DATETIME2 NULL,  -- Thời gian giải quyết
        [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),  -- Thời gian tạo
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())  -- Thời gian cập nhật
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
