IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'PaymentDB')
BEGIN
	CREATE DATABASE [PaymentDB];
END;
GO
