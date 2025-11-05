IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'BookingDB')
BEGIN
	CREATE DATABASE [BookingDB];
END;
GO
