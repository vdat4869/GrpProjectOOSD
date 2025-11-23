# ============================================
# SCRIPT IMPORT DATABASE - WINDOWS POWERSHELL
# ============================================
# Script này import databases từ backup files
# Sử dụng: .\import-db.ps1 -Path ".\database\exports\20241120_120000"
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Path
)

$ErrorActionPreference = "Stop"

# Cấu hình
$ContainerName = "ev-sql"
$SaPassword = $env:SA_PASSWORD
if (-not $SaPassword) {
    $SaPassword = "YourStrong@Passw0rd"
}

if (-not (Test-Path $Path)) {
    Write-Host "Error: Export path not found: $Path" -ForegroundColor Red
    exit 1
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "IMPORTING DATABASES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Container: $ContainerName" -ForegroundColor Yellow
Write-Host "Import Path: $Path" -ForegroundColor Yellow
Write-Host ""

# Danh sách databases cần import
$Databases = @(
    "auth_db",
    "ownership_db",
    "booking_db",
    "payment_db",
    "report_db"
)

foreach ($DbName in $Databases) {
    $BackupFile = "$Path\$DbName.bak"
    
    if (-not (Test-Path $BackupFile)) {
        Write-Host "Skipping $DbName (backup file not found)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Importing $DbName..." -ForegroundColor Green
    
    try {
        # Copy backup file vào container
        $ContainerBackupPath = "/tmp/$DbName.bak"
        docker cp $BackupFile "$ContainerName`:$ContainerBackupPath"
        
        # Restore database từ backup
        # Lưu ý: Cần đảm bảo database không đang được sử dụng
        docker exec $ContainerName /opt/mssql-tools18/bin/sqlcmd `
            -S localhost -U sa -P $SaPassword `
            -Q "ALTER DATABASE [$DbName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                RESTORE DATABASE [$DbName] FROM DISK = '$ContainerBackupPath' WITH REPLACE;
                ALTER DATABASE [$DbName] SET MULTI_USER;"
        
        # Xóa file backup trong container
        docker exec $ContainerName rm $ContainerBackupPath
        
        Write-Host "  ✓ $DbName imported successfully" -ForegroundColor Green
        
    } catch {
        Write-Host "  ✗ Error importing $DbName : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "IMPORT COMPLETED" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

