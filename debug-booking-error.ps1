# Debug Booking Error Script
# This script helps debug 500 error when creating booking from frontend

Write-Host "=== Debugging Booking Creation Error ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check if services are running
Write-Host "1. Checking services status..." -ForegroundColor Yellow
$bookingStatus = docker compose ps booking-service --format json | ConvertFrom-Json
$gatewayStatus = docker compose ps gateway-service --format json | ConvertFrom-Json

if ($bookingStatus.State -eq "running") {
    Write-Host "   [OK] Booking service is running" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Booking service is not running!" -ForegroundColor Red
    Write-Host "   Start it with: docker compose up -d booking-service" -ForegroundColor Yellow
    exit 1
}

if ($gatewayStatus.State -eq "running") {
    Write-Host "   [OK] Gateway service is running" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Gateway service is not running!" -ForegroundColor Red
    Write-Host "   Start it with: docker compose up -d gateway-service" -ForegroundColor Yellow
    exit 1
}

# 2. Show recent logs
Write-Host ""
Write-Host "2. Recent booking service logs (last 50 lines):" -ForegroundColor Yellow
Write-Host "   (Look for errors related to CreateBooking)" -ForegroundColor Gray
docker compose logs --tail=50 booking-service

# 3. Test create booking via API
Write-Host ""
Write-Host "3. Testing create booking via API..." -ForegroundColor Yellow

# Login
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

# Get vehicles
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $vehicles = Invoke-RestMethod -Uri "http://localhost:8000/api/booking/vehicles" -Method Get -Headers $headers -ErrorAction Stop
    $vehicleId = $vehicles[0].id
    Write-Host "   [OK] Found vehicles. Using Vehicle ID: $vehicleId" -ForegroundColor Green
} catch {
    Write-Host "   [WARNING] Failed to get vehicles: $($_.Exception.Message)" -ForegroundColor Yellow
    $vehicleId = 1
}

# Create booking
$startTime = (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ss")
$endTime = (Get-Date).AddHours(4).ToString("yyyy-MM-ddTHH:mm:ss")

$bookingBody = @{
    vehicleId = $vehicleId
    coOwnerId = [int]$userId
    startTime = $startTime
    endTime = $endTime
    note = "Test booking from debug script"
} | ConvertTo-Json

Write-Host ""
Write-Host "   Request body:" -ForegroundColor Gray
Write-Host "   $bookingBody" -ForegroundColor DarkGray

try {
    $bookingResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/booking/createBooking" -Method Post -Body $bookingBody -ContentType "application/json" -Headers $headers -ErrorAction Stop
    Write-Host "   [OK] Booking created successfully!" -ForegroundColor Green
    Write-Host "   Booking ID: $($bookingResponse.id)" -ForegroundColor Gray
} catch {
    Write-Host "   [ERROR] Failed to create booking" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "   Error Response:" -ForegroundColor Red
        Write-Host "   $responseBody" -ForegroundColor Yellow
        
        try {
            $errorObj = $responseBody | ConvertFrom-Json
            Write-Host ""
            Write-Host "   Parsed Error:" -ForegroundColor Red
            Write-Host "   Error: $($errorObj.error)" -ForegroundColor Yellow
            if ($errorObj.details) {
                Write-Host "   Details: $($errorObj.details)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   (Could not parse error response as JSON)" -ForegroundColor Gray
        }
    }
}

# 4. Show error logs
Write-Host ""
Write-Host "4. Error logs from booking service (last 20 lines with 'error' or 'fail'):" -ForegroundColor Yellow
docker compose logs --tail=100 booking-service | Select-String -Pattern "error|fail|Error|Exception" -Context 2,2

Write-Host ""
Write-Host "=== Debug Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To monitor logs in real-time:" -ForegroundColor Yellow
Write-Host "   docker compose logs -f booking-service" -ForegroundColor Gray
Write-Host ""
Write-Host "To check database:" -ForegroundColor Yellow
Write-Host "   docker compose exec mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Password123' -d booking_db -Q 'SELECT * FROM CoOwners'" -ForegroundColor Gray

