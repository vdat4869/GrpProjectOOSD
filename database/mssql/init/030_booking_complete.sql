-- ============================================
-- TẠO DATABASE CHO BOOKING SERVICE
-- ============================================
-- File này tạo database "booking_db" cho Booking Service
-- Database này quản lý việc đặt xe, lịch sử dụng xe, và check-in/check-out
-- 
-- Các bảng chính trong database này:
-- - Vehicles: Danh sách các xe trong hệ thống
-- - CoOwners: Thông tin các chủ sở hữu (đồng bộ từ Ownership Service)
-- - Bookings: Lịch đặt xe (thời gian bắt đầu, kết thúc, trạng thái)
-- - BookingHistory: Lịch sử sử dụng xe (sau khi hoàn thành booking)
--
-- Các trạng thái booking:
-- - Pending: Đang chờ phê duyệt
-- - Approved: Đã được phê duyệt
-- - Rejected: Bị từ chối
-- - InProgress: Đang sử dụng
-- - Completed: Đã hoàn thành
-- - Cancelled: Đã hủy
--
-- Lưu ý: Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

-- Kiểm tra xem database "booking_db" đã tồn tại chưa
-- Nếu chưa tồn tại thì mới tạo mới
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'booking_db')
BEGIN
	-- Tạo database mới với tên "booking_db"
	-- Database này sẽ sử dụng collation mặc định của SQL Server
	CREATE DATABASE [booking_db];
END;
GO


-- ============================================
-- SCHEMA CHI TIẾT CHO BOOKING DATABASE
-- ============================================
-- File này định nghĩa cấu trúc bảng cho database booking_db
-- Database này quản lý việc đặt xe, lịch sử dụng xe, và check-in/check-out
-- 
-- Các bảng chính:
-- - Vehicles: Danh sách các xe trong hệ thống
-- - CoOwners: Thông tin các chủ sở hữu (đồng bộ từ Ownership Service)
-- - Bookings: Lịch đặt xe (thời gian bắt đầu, kết thúc, trạng thái)
--
-- Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

USE [booking_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'[dbo].[Bookings]', N'U') IS NOT NULL DROP TABLE [dbo].[Bookings];
IF OBJECT_ID(N'[dbo].[CoOwners]', N'U') IS NOT NULL DROP TABLE [dbo].[CoOwners];
IF OBJECT_ID(N'[dbo].[Vehicles]', N'U') IS NOT NULL DROP TABLE [dbo].[Vehicles];
GO

-- ============================================
-- BẢNG VEHICLES - DANH SÁCH XE
-- ============================================
-- Lưu trữ danh sách các xe trong hệ thống
-- Thông tin này được đồng bộ từ Ownership Service (VehicleGroups)
-- ============================================
CREATE TABLE [dbo].[Vehicles] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Vehicles] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [Name] NVARCHAR(100) NOT NULL,  -- Tên xe (ví dụ: "Toyota Camry - ABC-123")
    [IsActive] BIT NOT NULL DEFAULT(1)  -- Trạng thái (1=active, 0=inactive)
);
GO

-- ============================================
-- BẢNG COOWNERS - CHỦ SỞ HỮU (ĐỒNG BỘ)
-- ============================================
-- Lưu trữ thông tin các chủ sở hữu (đồng bộ từ Ownership Service)
-- Bảng này được sử dụng để tối ưu hiệu suất query, tránh join với Ownership Service
-- ============================================
CREATE TABLE [dbo].[CoOwners] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_CoOwners] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [Name] NVARCHAR(100) NOT NULL,  -- Tên chủ sở hữu
    [OwnershipRatio] DECIMAL(5,2) NOT NULL,  -- Tỷ lệ sở hữu (ví dụ: 40.50 = 40.5%)
    [UsageCount] INT NOT NULL DEFAULT(0)  -- Số lần sử dụng xe (để phân tích)
);
GO

-- ============================================
-- BẢNG BOOKINGS - LỊCH ĐẶT XE
-- ============================================
-- Lưu trữ lịch đặt xe của các chủ sở hữu
-- Mỗi booking đại diện cho một lần sử dụng xe trong khoảng thời gian cụ thể
-- 
-- Các trạng thái:
-- - Pending: Đang chờ phê duyệt
-- - Approved: Đã được phê duyệt, sẵn sàng sử dụng
-- - Rejected: Bị từ chối
-- - InProgress: Đang sử dụng (đã check-in)
-- - Completed: Đã hoàn thành (đã check-out)
-- - Cancelled: Đã hủy
-- ============================================
CREATE TABLE [dbo].[Bookings] (
    [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Bookings] PRIMARY KEY,  -- ID tự tăng, khóa chính
    [VehicleId] INT NOT NULL,  -- ID xe (foreign key đến Vehicles)
    [CoOwnerId] INT NOT NULL,  -- ID chủ sở hữu đặt xe (foreign key đến CoOwners)
    [StartTime] DATETIME2 NOT NULL,  -- Thời gian bắt đầu sử dụng
    [EndTime] DATETIME2 NOT NULL,  -- Thời gian kết thúc sử dụng
    [Status] NVARCHAR(20) NOT NULL DEFAULT(N'Pending'),  -- Trạng thái booking
    [Note] NVARCHAR(255) NULL,  -- Ghi chú (mục đích sử dụng...)
    [DistanceKm] DECIMAL(10,2) NULL,  -- Quãng đường đi được (sau khi check-out)
    [Cost] DECIMAL(18,2) NULL,  -- Chi phí sử dụng (tính theo quãng đường và thời gian)
    [CheckInTime] DATETIME2 NULL,  -- Thời gian check-in (bắt đầu sử dụng thực tế)
    [CheckOutTime] DATETIME2 NULL,  -- Thời gian check-out (kết thúc sử dụng thực tế)
    [QrCode] NVARCHAR(500) NULL,  -- Mã QR để check-in/check-out
    [DigitalSignature] NVARCHAR(1000) NULL,  -- Chữ ký số khi check-out (xác nhận trạng thái xe)
    -- Foreign key: Khi xóa Vehicle thì xóa luôn tất cả bookings của xe đó
    CONSTRAINT [FK_Bookings_Vehicles] FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicles]([Id]) ON DELETE CASCADE,
    -- Foreign key: Khi xóa CoOwner thì không xóa bookings (giữ lại lịch sử)
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


-- ============================================
-- THÊM BẢNG BOOKINGHISTORIES
-- ============================================
-- File này tạo bảng BookingHistories để lưu lịch sử booking đã hoàn thành
-- Bảng này được tạo tự động khi booking được check-out thành công
-- 
-- Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

USE [booking_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Kiểm tra xem bảng BookingHistories đã tồn tại chưa
IF OBJECT_ID(N'[dbo].[BookingHistories]', N'U') IS NULL
BEGIN
    -- ============================================
    -- BẢNG BOOKINGHISTORIES - LỊCH SỬ BOOKING
    -- ============================================
    -- Lưu trữ lịch sử các booking đã hoàn thành (đã check-out)
    -- Bảng này được tạo tự động khi booking được check-out thành công
    -- ============================================
    CREATE TABLE [dbo].[BookingHistories] (
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_BookingHistories] PRIMARY KEY,  -- ID tự tăng, khóa chính
        [BookingId] INT NOT NULL,  -- ID của booking gốc
        [VehicleId] INT NOT NULL,  -- ID xe đã sử dụng
        [CoOwnerId] INT NOT NULL,  -- ID chủ sở hữu đã sử dụng xe
        [StartTime] DATETIME2 NOT NULL,  -- Thời gian bắt đầu đặt xe (theo booking gốc)
        [EndTime] DATETIME2 NOT NULL,  -- Thời gian kết thúc đặt xe (theo booking gốc)
        [CheckInTime] DATETIME2 NOT NULL,  -- Thời gian check-in thực tế (khi nhận xe)
        [CheckOutTime] DATETIME2 NOT NULL,  -- Thời gian check-out thực tế (khi trả xe)
        [DistanceKm] DECIMAL(18,2) NULL,  -- Quãng đường đã đi (km) - được cập nhật khi check-out
        [Cost] DECIMAL(18,2) NULL,  -- Chi phí phát sinh (VND) - được cập nhật khi check-out
        [Note] NVARCHAR(MAX) NULL,  -- Ghi chú bổ sung (nếu có)
        [CreatedAt] DATETIME2 NOT NULL DEFAULT(GETUTCDATE())  -- Thời gian tạo bản ghi lịch sử (khi check-out thành công)
    );
    
    -- Tạo index để tối ưu query
    CREATE INDEX [IX_BookingHistories_BookingId] ON [dbo].[BookingHistories]([BookingId]);
    CREATE INDEX [IX_BookingHistories_VehicleId] ON [dbo].[BookingHistories]([VehicleId]);
    CREATE INDEX [IX_BookingHistories_CoOwnerId] ON [dbo].[BookingHistories]([CoOwnerId]);
    CREATE INDEX [IX_BookingHistories_CheckOutTime] ON [dbo].[BookingHistories]([CheckOutTime]);
    
    PRINT 'Table BookingHistories created successfully.';
END
ELSE
BEGIN
    PRINT 'Table BookingHistories already exists.';
END
GO

-- ============================================
-- SCRIPT ĐỒNG BỘ COOWNERS TỪ OWNERSHIP_DB SANG BOOKING_DB
-- ============================================
-- Script này đồng bộ dữ liệu CoOwners từ ownership_db sang booking_db
-- Chạy script này sau khi có thay đổi về CoOwners trong ownership_db
-- 
-- Logic:
-- 1. Lấy tất cả CoOwners từ ownership_db
-- 2. So khớp với CoOwners trong booking_db theo tên (case-insensitive)
-- 3. Tạo mới nếu chưa có
-- 4. Cập nhật nếu đã tồn tại
--
-- Script này là idempotent - có thể chạy nhiều lần mà không gây lỗi
-- ============================================

USE [booking_db];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================
-- TẠO LINKED SERVER (NẾU CHƯA CÓ)
-- ============================================
-- Linked server cho phép truy cập database khác trên cùng SQL Server instance
IF NOT EXISTS (SELECT * FROM sys.servers WHERE name = 'EV_SQL')
BEGIN
    EXEC sp_addlinkedserver 
        @server = 'EV_SQL',
        @srvproduct = 'SQL Server';
    
    EXEC sp_addlinkedsrvlogin 
        @rmtsrvname = 'EV_SQL',
        @useself = 'true',
        @locallogin = NULL,
        @rmtuser = NULL,
        @rmtpassword = NULL;
    
    PRINT 'Linked server EV_SQL created successfully';
END
ELSE
BEGIN
    PRINT 'Linked server EV_SQL already exists';
END
GO

-- ============================================
-- STORED PROCEDURE: ĐỒNG BỘ COOWNERS
-- ============================================
IF OBJECT_ID(N'[dbo].[SyncCoOwnersFromOwnership]', N'P') IS NOT NULL
    DROP PROCEDURE [dbo].[SyncCoOwnersFromOwnership];
GO

CREATE PROCEDURE [dbo].[SyncCoOwnersFromOwnership]
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Created INT = 0;
    DECLARE @Updated INT = 0;
    DECLARE @Skipped INT = 0;
    DECLARE @Total INT = 0;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Tạo bảng tạm để lưu dữ liệu từ ownership_db
        IF OBJECT_ID('tempdb..#TempCoOwners') IS NOT NULL
            DROP TABLE #TempCoOwners;
            
        CREATE TABLE #TempCoOwners (
            Name NVARCHAR(100) NOT NULL,
            Email NVARCHAR(255) NULL,
            UserId NVARCHAR(100) NULL,
            OwnershipPercentage DECIMAL(5,2) NULL
        );
        
        -- Lấy dữ liệu từ ownership_db qua linked server
        -- Tính ownership percentage trung bình từ bảng Ownerships
        INSERT INTO #TempCoOwners (Name, Email, UserId, OwnershipPercentage)
        SELECT 
            c.FullName AS Name,
            c.Email,
            c.UserId,
            ISNULL(
                (SELECT AVG(CAST(o.OwnershipPercentage AS DECIMAL(5,2)))
                 FROM [EV_SQL].ownership_db.dbo.Ownerships o
                 WHERE o.CoOwnerId = c.Id AND o.IsActive = 1),
                50.00
            ) AS OwnershipPercentage
        FROM [EV_SQL].ownership_db.dbo.CoOwners c
        WHERE c.IsVerified = 1;
        
        -- Đếm tổng số
        SELECT @Total = COUNT(*) FROM #TempCoOwners;
        
        -- Đồng bộ từng CoOwner
        DECLARE @Name NVARCHAR(100);
        DECLARE @Email NVARCHAR(255);
        DECLARE @UserId NVARCHAR(100);
        DECLARE @OwnershipPercentage DECIMAL(5,2);
        DECLARE @ExistingId INT;
        DECLARE @ExistingName NVARCHAR(100);
        
        DECLARE coowner_cursor CURSOR FOR
        SELECT Name, Email, UserId, OwnershipPercentage
        FROM #TempCoOwners;
        
        OPEN coowner_cursor;
        FETCH NEXT FROM coowner_cursor INTO @Name, @Email, @UserId, @OwnershipPercentage;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Tìm CoOwner trong booking_db theo tên (case-insensitive)
            SELECT @ExistingId = Id, @ExistingName = Name
            FROM [dbo].[CoOwners]
            WHERE LOWER(Name) = LOWER(@Name);
            
            IF @ExistingId IS NOT NULL
            BEGIN
                -- Cập nhật nếu tên khác hoặc ownership ratio khác
                IF @ExistingName != @Name OR 
                   ABS((SELECT OwnershipRatio FROM [dbo].[CoOwners] WHERE Id = @ExistingId) - @OwnershipPercentage) > 0.01
                BEGIN
                    UPDATE [dbo].[CoOwners]
                    SET Name = @Name,
                        OwnershipRatio = @OwnershipPercentage
                    WHERE Id = @ExistingId;
                    
                    SET @Updated = @Updated + 1;
                    PRINT 'Updated CoOwner: ' + @Name + ' (ID: ' + CAST(@ExistingId AS NVARCHAR(10)) + ')';
                END
                ELSE
                BEGIN
                    SET @Skipped = @Skipped + 1;
                    PRINT 'Skipped existing CoOwner: ' + @Name + ' (ID: ' + CAST(@ExistingId AS NVARCHAR(10)) + ')';
                END
            END
            ELSE
            BEGIN
                -- Tạo mới
                INSERT INTO [dbo].[CoOwners] (Name, OwnershipRatio, UsageCount)
                VALUES (@Name, @OwnershipPercentage, 0);
                
                SET @Created = @Created + 1;
                PRINT 'Created CoOwner: ' + @Name;
            END
            
            FETCH NEXT FROM coowner_cursor INTO @Name, @Email, @UserId, @OwnershipPercentage;
        END
        
        CLOSE coowner_cursor;
        DEALLOCATE coowner_cursor;
        
        COMMIT TRANSACTION;
        
        -- Trả về kết quả
        SELECT 
            @Total AS Total,
            @Created AS Created,
            @Updated AS Updated,
            @Skipped AS Skipped,
            'Sync completed successfully' AS Message;
        
        PRINT 'Sync completed: ' + CAST(@Created AS NVARCHAR(10)) + ' created, ' + 
              CAST(@Updated AS NVARCHAR(10)) + ' updated, ' + 
              CAST(@Skipped AS NVARCHAR(10)) + ' skipped';
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        PRINT 'Error: ' + @ErrorMessage;
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
    
    -- Cleanup
    IF OBJECT_ID('tempdb..#TempCoOwners') IS NOT NULL
        DROP TABLE #TempCoOwners;
END;
GO

-- ============================================
-- HƯỚNG DẪN SỬ DỤNG
-- ============================================
-- 
-- CÁCH 1: Chạy stored procedure trực tiếp (Khuyến nghị)
-- EXEC [dbo].[SyncCoOwnersFromOwnership];
-- GO
--
-- CÁCH 2: Sử dụng API endpoint (từ application code)
-- Gọi endpoint POST /api/booking/sync-coowners đã tạo trước đó
-- Đây là cách đơn giản nhất và không cần cấu hình linked server
--
-- CÁCH 3: Tạo SQL Agent Job để chạy tự động
-- 1. Mở SQL Server Management Studio
-- 2. Tạo New Job
-- 3. Thêm Step với command: EXEC [booking_db].[dbo].[SyncCoOwnersFromOwnership];
-- 4. Thiết lập schedule (ví dụ: chạy mỗi giờ hoặc mỗi ngày)
--
-- CÁCH 4: Sử dụng OPENROWSET (nếu không dùng linked server)
-- Cần cập nhật stored procedure để sử dụng OPENROWSET thay vì linked server
--
-- ============================================
-- CHẠY STORED PROCEDURE NGAY SAU KHI TẠO
-- ============================================
-- Uncomment dòng dưới để chạy sync ngay sau khi tạo stored procedure
-- EXEC [dbo].[SyncCoOwnersFromOwnership];
-- GO

PRINT 'Stored procedure SyncCoOwnersFromOwnership created successfully';
GO

