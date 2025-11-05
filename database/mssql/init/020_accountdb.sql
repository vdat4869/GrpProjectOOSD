IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'AccountDB')
BEGIN
	CREATE DATABASE [AccountDB];
END;
GO
