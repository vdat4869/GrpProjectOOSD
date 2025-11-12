-- Auth Service database (new naming)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'auth_db')
BEGIN
	CREATE DATABASE [auth_db];
END;
GO


