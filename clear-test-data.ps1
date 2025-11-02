# Script to clear test data from Account Ownership Service database
# Usage: .\clear-test-data.ps1

Write-Host "=== Clearing Test Data from Account Ownership Service ===" -ForegroundColor Cyan

# Database connection string (using local SQL Server)
$connectionString = "Server=localhost,1433;Database=EvAccountOwnershipDb;User Id=sa;Password=YourStrong@Password123;TrustServerCertificate=True;"

Write-Host "Connecting to database..." -ForegroundColor Yellow

try {
    # Load SqlServer module if available, otherwise use sqlcmd
    $useSqlCmd = $false
    
    try {
        Import-Module SqlServer -ErrorAction Stop
        Write-Host "Using SqlServer PowerShell module" -ForegroundColor Green
    } catch {
        Write-Host "SqlServer module not found, using sqlcmd" -ForegroundColor Yellow
        $useSqlCmd = $true
    }
    
    if ($useSqlCmd) {
        # Use sqlcmd
        Write-Host "Executing delete statements via sqlcmd..." -ForegroundColor Yellow
        
        $deleteScripts = @(
            "DELETE FROM EContracts",
            "DELETE FROM Ownerships",
            "DELETE FROM CoOwners WHERE Email LIKE '%test%' OR Email LIKE '%@%'"
        )
        
        foreach ($script in $deleteScripts) {
            Write-Host "Executing: $script" -ForegroundColor Gray
            $result = sqlcmd -S localhost,1433 -U sa -P "YourStrong@Password123" -C -Q "$script" 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Successfully executed" -ForegroundColor Green
            } else {
                Write-Host "✗ Error: $result" -ForegroundColor Red
            }
        }
        
        Write-Host "`n✓ Test data cleared successfully!" -ForegroundColor Green
        
    } else {
        # Use SqlServer module
        Write-Host "Executing delete statements via SqlServer module..." -ForegroundColor Yellow
        
        $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
        $connection.Open()
        
        $commands = @(
            "DELETE FROM EContracts",
            "DELETE FROM Ownerships",
            "DELETE FROM CoOwners WHERE Email LIKE '%test%' OR Email LIKE '%@%'"
        )
        
        foreach ($cmd in $commands) {
            Write-Host "Executing: $cmd" -ForegroundColor Gray
            $command = New-Object System.Data.SqlClient.SqlCommand($cmd, $connection)
            $rowsAffected = $command.ExecuteNonQuery()
            Write-Host "✓ Deleted $rowsAffected rows" -ForegroundColor Green
        }
        
        $connection.Close()
        Write-Host "`n✓ Test data cleared successfully!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "`n✗ Error: $_" -ForegroundColor Red
    Write-Host "`nPlease ensure:" -ForegroundColor Yellow
    Write-Host "1. SQL Server is running on localhost:1433" -ForegroundColor Yellow
    Write-Host "2. Database EvAccountOwnershipDb exists" -ForegroundColor Yellow
    Write-Host "3. SQL credentials are correct" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan

