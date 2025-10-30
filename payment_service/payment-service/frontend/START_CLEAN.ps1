# ================================
# 🚀 START CLEAN - Complete Fix
# ================================
# This script will fix all errors and start your app fresh

param(
    [switch]$NukeCache = $false
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 Starting Payment Service Frontend     ║" -ForegroundColor Cyan
Write-Host "║     Complete Clean Start                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any existing processes
Write-Host "Step 1: Stopping existing processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "  ✓ Stopped $($nodeProcesses.Count) Node process(es)" -ForegroundColor Green
} else {
    Write-Host "  ✓ No existing Node processes" -ForegroundColor Green
}
Start-Sleep -Seconds 1

# Step 2: Clean build artifacts
Write-Host ""
Write-Host "Step 2: Cleaning build artifacts..." -ForegroundColor Yellow
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  ✓ Removed dist/ folder" -ForegroundColor Green

# Step 3: Clear npm cache (optional)
if ($NukeCache) {
    Write-Host ""
    Write-Host "Step 3: Nuclear clean (removing node_modules)..." -ForegroundColor Yellow
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed node_modules/" -ForegroundColor Green
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "  ✓ Dependencies reinstalled" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Step 3: Clearing npm cache..." -ForegroundColor Yellow
    npm cache clean --force 2>$null
    Write-Host "  ✓ npm cache cleared" -ForegroundColor Green
}

# Step 4: Check VNPay service
Write-Host ""
Write-Host "Step 4: Checking VNPay service..." -ForegroundColor Yellow
try {
    $vnpayHealth = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ✓ VNPay service is running" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ VNPay service is NOT running" -ForegroundColor Yellow
    Write-Host "    To start it: cd ../../vnpay-service && npm start" -ForegroundColor Gray
}

# Step 5: Display browser instructions
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📋 IMPORTANT: Clear Browser Cache" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  After the dev server starts, do ONE of these:" -ForegroundColor White
Write-Host ""
Write-Host "  Option A (Fastest):" -ForegroundColor Cyan
Write-Host "    Press Ctrl+Shift+N (Incognito mode)" -ForegroundColor White
Write-Host "    Go to http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "  Option B (Permanent):" -ForegroundColor Cyan
Write-Host "    1. Press Ctrl+Shift+Delete" -ForegroundColor White
Write-Host "    2. Check 'Cached images and files'" -ForegroundColor White
Write-Host "    3. Select 'All time'" -ForegroundColor White
Write-Host "    4. Click 'Clear data'" -ForegroundColor White
Write-Host "    5. Press Ctrl+Shift+R (hard reload)" -ForegroundColor White
Write-Host ""
Write-Host "  Option C (DevTools):" -ForegroundColor Cyan
Write-Host "    1. Press F12" -ForegroundColor White
Write-Host "    2. Right-click refresh button" -ForegroundColor White
Write-Host "    3. Select 'Empty Cache and Hard Reload'" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 6: Start dev server
Write-Host "Step 5: Starting Vite dev server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  🎉 Dev server starting..." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  URL: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Test page: file:///$PWD/cache-test.html" -ForegroundColor Gray
Write-Host ""
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start Vite
npm run dev

