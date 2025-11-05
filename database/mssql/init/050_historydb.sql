IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'HistoryDB')
BEGIN
	CREATE DATABASE [HistoryDB];
END;
GO
