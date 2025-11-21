# Test AI Service Script
# This script tests the AI service endpoints

Write-Host "=== Testing AI Service ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check if AI service container is running
Write-Host "1. Checking AI service container status..." -ForegroundColor Yellow
$aiStatus = docker compose ps ai-service --format json | ConvertFrom-Json
if ($aiStatus) {
    Write-Host "   [OK] AI service container: $($aiStatus.State)" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] AI service container not found!" -ForegroundColor Red
    Write-Host "   Try: docker compose up -d ai-service" -ForegroundColor Yellow
    exit 1
}

# 2. Check health endpoint
Write-Host ""
Write-Host "2. Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:8010/health" -Method Get -ErrorAction Stop
    Write-Host "   [OK] Health check successful" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.status)" -ForegroundColor Gray
    Write-Host "   Service: $($healthResponse.service)" -ForegroundColor Gray
} catch {
    Write-Host "   [ERROR] Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure AI service is running on port 8010" -ForegroundColor Yellow
}

# 3. Test booking suggestion endpoint
Write-Host ""
Write-Host "3. Testing booking suggestion endpoint..." -ForegroundColor Yellow
$bookingRequest = @{
    vehicle_group_id = "test-group-123"
    requested_start = (Get-Date).AddHours(1).ToString("yyyy-MM-ddTHH:mm:ss")
    requested_end = (Get-Date).AddHours(3).ToString("yyyy-MM-ddTHH:mm:ss")
    co_owner_id = "test-coowner-1"
    ownership_percentage = 0.5
    usage_history = @()
} | ConvertTo-Json

try {
    $bookingResponse = Invoke-RestMethod -Uri "http://localhost:8010/api/ai/suggestions/booking" -Method Post -Body $bookingRequest -ContentType "application/json" -ErrorAction Stop
    Write-Host "   [OK] Booking suggestion successful" -ForegroundColor Green
    Write-Host "   Fairness Score: $($bookingResponse.fairness_score)" -ForegroundColor Gray
    Write-Host "   Reason: $($bookingResponse.reason)" -ForegroundColor Gray
} catch {
    Write-Host "   [ERROR] Booking suggestion failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Gray
    }
}

# 4. Test through Gateway
Write-Host ""
Write-Host "4. Testing through Gateway (http://localhost:8000)..." -ForegroundColor Yellow
try {
    $gatewayHealth = Invoke-RestMethod -Uri "http://localhost:8000/api/ai/suggestions/booking" -Method Post -Body $bookingRequest -ContentType "application/json" -ErrorAction Stop
    Write-Host "   [OK] Gateway routing successful" -ForegroundColor Green
    Write-Host "   Fairness Score: $($gatewayHealth.fairness_score)" -ForegroundColor Gray
} catch {
    Write-Host "   [ERROR] Gateway routing failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Gray
    }
}

# 5. Check logs
Write-Host ""
Write-Host "5. Recent AI service logs:" -ForegroundColor Yellow
docker compose logs --tail=20 ai-service

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you see errors, check:" -ForegroundColor Yellow
Write-Host "  1. AI service is running: docker compose ps ai-service" -ForegroundColor Gray
Write-Host "  2. Gateway is running: docker compose ps gateway-service" -ForegroundColor Gray
Write-Host "  3. Network connectivity: docker network inspect ev_network" -ForegroundColor Gray
Write-Host "  4. AI service logs: docker compose logs -f ai-service" -ForegroundColor Gray

