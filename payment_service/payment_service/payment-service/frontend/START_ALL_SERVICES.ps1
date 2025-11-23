# ================================
# 🚀 START FRONTEND SERVICE
# ================================
# Note: VNPay service has been removed from this project

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 Starting Frontend Service             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  Note: VNPay service has been removed" -ForegroundColor Yellow
Write-Host "   Payment functionality is currently locked" -ForegroundColor Yellow
Write-Host ""

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📋 REMEMBER: Clear Browser Cache!" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  After browser opens, press Ctrl+Shift+R" -ForegroundColor White
Write-Host "  OR use Incognito mode (Ctrl+Shift+N)" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service:" -ForegroundColor Cyan
Write-Host "  🎨 Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  🧪 Cache Test: file:///$PWD/cache-test.html" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start frontend in this window
npm run dev

