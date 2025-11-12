-- Ownership Service database (merged account + group)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ownership_db')
BEGIN
	CREATE DATABASE [ownership_db];
END;
GO


