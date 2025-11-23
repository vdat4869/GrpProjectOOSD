# ============================================
# SCRIPT EXPORT DATABASE - WINDOWS POWERSHELL
# ============================================
# Script này export tất cả databases từ SQL Server container
# Sử dụng: .\export-db.ps1
# ============================================

$ErrorActionPreference = "Stop"

# Cấu hình
$ContainerName = "ev-sql"
$SaPassword = $env:SA_PASSWORD
if (-not $SaPassword) {
    $SaPassword = "YourStrong@Passw0rd"
}

$ExportDir = ".\database\exports"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ExportPath = "$ExportDir\$Timestamp"

# Tạo thư mục export nếu chưa có
if (-not (Test-Path $ExportDir)) {
    New-Item -ItemType Directory -Path $ExportDir | Out-Null
}
New-Item -ItemType Directory -Path $ExportPath | Out-Null

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "EXPORTING DATABASES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Container: $ContainerName" -ForegroundColor Yellow
Write-Host "Export Path: $ExportPath" -ForegroundColor Yellow
Write-Host ""

# Danh sách databases cần export
$Databases = @(
    "auth_db",
    "ownership_db",
    "booking_db",
    "payment_db",
    "report_db"
)

foreach ($DbName in $Databases) {
    Write-Host "Exporting $DbName..." -ForegroundColor Green
    
    $BackupFile = "$ExportPath\$DbName.bak"
    $ScriptFile = "$ExportPath\$DbName.sql"
    
    try {
        # Tạo backup file (.bak)
        docker exec $ContainerName /opt/mssql-tools18/bin/sqlcmd `
            -S localhost -U sa -P $SaPassword `
            -Q "BACKUP DATABASE [$DbName] TO DISK = '/tmp/$DbName.bak' WITH FORMAT, INIT, COMPRESSION"
        
        # Copy backup file từ container ra host
        docker cp "$ContainerName`:/tmp/$DbName.bak" $BackupFile
        
        # Xóa file backup trong container
        docker exec $ContainerName rm "/tmp/$DbName.bak"
        
        Write-Host "  ✓ Backup created: $BackupFile" -ForegroundColor Green
        
        # Export schema và data dưới dạng SQL script
        docker exec $ContainerName /opt/mssql-tools18/bin/sqlcmd `
            -S localhost -U sa -P $SaPassword `
            -d $DbName `
            -Q "EXEC sp_helpdb '$DbName'" `
            -W -h -1 | Out-Null
        
        # Export schema
        docker exec $ContainerName /opt/mssql-tools18/bin/sqlcmd `
            -S localhost -U sa -P $SaPassword `
            -d $DbName `
            -Q "SELECT 'USE [$DbName]; GO' + CHAR(13) + CHAR(10) + 
                (SELECT OBJECT_DEFINITION(OBJECT_ID) FROM sys.objects WHERE type = 'U' FOR XML PATH(''))" `
            -W -h -1 | Out-File -FilePath $ScriptFile -Encoding UTF8
        
        Write-Host "  ✓ SQL script created: $ScriptFile" -ForegroundColor Green
        
    } catch {
        Write-Host "  ✗ Error exporting $DbName : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "EXPORT COMPLETED" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Export location: $ExportPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "To share with team:" -ForegroundColor Cyan
Write-Host "  1. Commit export files to git (if small)" -ForegroundColor White
Write-Host "  2. Or share via cloud storage (Google Drive, OneDrive, etc.)" -ForegroundColor White
Write-Host "  3. Team members can use import-db.ps1 to restore" -ForegroundColor White
Write-Host ""

