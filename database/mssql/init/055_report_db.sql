-- Report Service database (formerly history analytics)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'report_db')
BEGIN
	CREATE DATABASE [report_db];
END;
GO


