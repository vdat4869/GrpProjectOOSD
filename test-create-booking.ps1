# Test Create Booking Script
# This script tests creating a booking and shows detailed error information

Write-Host "=== Testing Create Booking ===" -ForegroundColor Cyan
Write-Host ""

# 1. Login to get token
Write-Host "1. Logging in..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "coowner@example.com"
        password = "Coowner@12345"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    $token = $loginResponse.data.accessToken
    $userId = $loginResponse.data.user.id
    Write-Host "   [OK] Login successful. User ID: $userId" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Setup headers
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 3. Get vehicles
Write-Host ""
Write-Host "2. Getting vehicles..." -ForegroundColor Yellow
try {
    $vehicles = Invoke-RestMethod -Uri "http://localhost:8000/api/booking/vehicles" -Method Get -Headers $headers -ErrorAction Stop
    if ($vehicles.Count -eq 0) {
        Write-Host "   [WARNING] No vehicles found. Booking service will create a default vehicle." -ForegroundColor Yellow
        $vehicleId = 1
    } else {
        $vehicleId = $vehicles[0].id
        Write-Host "   [OK] Found $($vehicles.Count) vehicles. Using Vehicle ID: $vehicleId" -ForegroundColor Green
    }
} catch {
    Write-Host "   [WARNING] Failed to get vehicles: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Using default Vehicle ID: 1" -ForegroundColor Gray
    $vehicleId = 1
}

# 4. Create booking
Write-Host ""
Write-Host "3. Creating booking..." -ForegroundColor Yellow
$startTime = (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ss")
$endTime = (Get-Date).AddHours(4).ToString("yyyy-MM-ddTHH:mm:ss")

$bookingBody = @{
    vehicleId = $vehicleId
    coOwnerId = [int]$userId
    startTime = $startTime
    endTime = $endTime
    note = "Test booking via PowerShell script"
} | ConvertTo-Json

try {
    $bookingResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/booking/createBooking" -Method Post -Body $bookingBody -ContentType "application/json" -Headers $headers -ErrorAction Stop
    Write-Host "   [OK] Booking created successfully!" -ForegroundColor Green
    Write-Host "   Booking ID: $($bookingResponse.id)" -ForegroundColor Gray
    Write-Host "   Vehicle: $($bookingResponse.vehicleName)" -ForegroundColor Gray
    Write-Host "   Status: $($bookingResponse.status)" -ForegroundColor Gray
} catch {
    Write-Host "   [ERROR] Failed to create booking" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    
    # Try to read error response
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Error Response: $responseBody" -ForegroundColor Gray
        
        # Try to parse as JSON
        try {
            $errorObj = $responseBody | ConvertFrom-Json
            Write-Host "   Error: $($errorObj.error)" -ForegroundColor Red
            if ($errorObj.details) {
                Write-Host "   Details: $($errorObj.details)" -ForegroundColor Yellow
            }
            if ($errorObj.stackTrace) {
                Write-Host "   Stack Trace: $($errorObj.stackTrace)" -ForegroundColor DarkGray
            }
        } catch {
            Write-Host "   Raw Response: $responseBody" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "   Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check booking service logs: docker compose logs booking-service" -ForegroundColor Gray
    Write-Host "   2. Check if vehicle exists: docker compose exec booking-service dotnet run --no-build" -ForegroundColor Gray
    Write-Host "   3. Seed test data: Invoke-RestMethod -Uri 'http://localhost:8000/api/booking/dev-seed' -Method Get" -ForegroundColor Gray
}

# 5. Check logs
Write-Host ""
Write-Host "4. Recent booking service logs:" -ForegroundColor Yellow
docker compose logs --tail=30 booking-service

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan

