-- Booking Service database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'booking_db')
BEGIN
	CREATE DATABASE [booking_db];
END;
GO


