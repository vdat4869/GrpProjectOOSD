# Clean Restart Script for Payment Service Frontend
# This script cleans all caches and restarts the dev server fresh

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🧹 Cleaning Frontend Cache" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Remove dist folder
Write-Host "1. Removing dist folder..." -ForegroundColor Yellow
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "   ✓ Dist folder removed" -ForegroundColor Green

# Step 2: Clear node cache
Write-Host "2. Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>$null
Write-Host "   ✓ npm cache cleared" -ForegroundColor Green

# Step 3: Reinstall dependencies (optional, uncomment if needed)
# Write-Host "3. Reinstalling dependencies..." -ForegroundColor Yellow
# Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
# npm install
# Write-Host "   ✓ Dependencies reinstalled" -ForegroundColor Green

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Dev Server" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Remember to:" -ForegroundColor Yellow
Write-Host "   1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "   2. Hard reload (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "   3. Or use Incognito mode" -ForegroundColor White
Write-Host ""
Write-Host "Starting Vite dev server..." -ForegroundColor Green
Write-Host ""

# Start dev server
npm run dev

