-- Payment Service database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'payment_db')
BEGIN
	CREATE DATABASE [payment_db];
END;
GO


