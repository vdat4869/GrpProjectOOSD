# Script test tất cả API endpoints và chức năng
# Gộp từ: test-api-with-auth.ps1, test-booking-api.ps1, test-frontend-features.ps1

Write-Host "=== Testing All API Endpoints ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check services
Write-Host "1. Checking services..." -ForegroundColor Yellow
$gatewayStatus = docker compose ps gateway-service --format "{{.Status}}" 2>$null
if ($gatewayStatus -like "*Up*") {
    Write-Host "   ✓ Gateway service is running" -ForegroundColor Green
} else {
    Write-Host "   ✗ Gateway service is not running. Start with: docker compose up -d" -ForegroundColor Red
    exit 1
}

# Step 2: Login
Write-Host "`n2. Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "coowner@example.com"
    password = "Coowner@12345"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    $token = $loginResponse.data.accessToken
    $userId = $loginResponse.data.user.id
    Write-Host "   ✓ Login successful" -ForegroundColor Green
    Write-Host "   User ID: $userId" -ForegroundColor Gray
    Write-Host "   Token: $($token.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure to seed accounts first" -ForegroundColor Yellow
    exit 1
}

# Setup headers
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 3: Test Get Bookings
Write-Host "`n3. Test Get Bookings..." -ForegroundColor Yellow
try {
    $bookings = Invoke-RestMethod -Uri "http://localhost:8000/api/booking/allBooking" -Method Get -ErrorAction Stop
    Write-Host "   ✓ Get bookings successful" -ForegroundColor Green
    Write-Host "   Found $($bookings.Count) bookings" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Get bookings failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Test Get Vehicle Groups
Write-Host "`n4. Test Get Vehicle Groups..." -ForegroundColor Yellow
try {
    $groups = Invoke-RestMethod -Uri "http://localhost:8000/api/ownership/vehiclegroups" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "   ✓ Get vehicle groups successful" -ForegroundColor Green
    Write-Host "   Found $($groups.Count) groups" -ForegroundColor Gray
    if ($groups.Count -gt 0) {
        Write-Host "   First group: $($groups[0].name)" -ForegroundColor Gray
        $groupId = $groups[0].id
    }
} catch {
    Write-Host "   ✗ Get vehicle groups failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Test Get CoOwners (Admin/Staff only)
Write-Host "`n5. Test Get CoOwners (requires Admin/Staff role)..." -ForegroundColor Yellow
try {
    $coOwners = Invoke-RestMethod -Uri "http://localhost:8000/api/ownership/coowners" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "   ✓ Get co-owners successful" -ForegroundColor Green
    Write-Host "   Found $($coOwners.Count) co-owners" -ForegroundColor Gray
} catch {
    Write-Host "   ⚠ Get co-owners failed (expected for Co-owner role): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 6: Test Create Booking
Write-Host "`n6. Test Create Booking..." -ForegroundColor Yellow
$bookingBody = @{
    vehicleId = 1
    coOwnerId = 1
    startTime = (Get-Date).AddHours(1).ToString("yyyy-MM-ddTHH:mm:ss")
    endTime = (Get-Date).AddHours(3).ToString("yyyy-MM-ddTHH:mm:ss")
    note = "Test booking from script"
} | ConvertTo-Json

try {
    $newBooking = Invoke-RestMethod -Uri "http://localhost:8000/api/booking/createBooking" -Method Post -Body $bookingBody -ContentType "application/json" -Headers $headers -ErrorAction Stop
    Write-Host "   ✓ Create booking successful" -ForegroundColor Green
    Write-Host "   Booking ID: $($newBooking.id)" -ForegroundColor Gray
    $bookingId = $newBooking.id
} catch {
    Write-Host "   ✗ Create booking failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure vehicle and co-owner exist" -ForegroundColor Yellow
}

# Step 7: Test Get QR Code
if ($bookingId) {
    Write-Host "`n7. Test Get QR Code..." -ForegroundColor Yellow
    try {
        $qrCode = Invoke-RestMethod -Uri "http://localhost:8000/api/booking/$bookingId/qr-code" -Method Get -Headers $headers -ErrorAction Stop
        Write-Host "   ✓ QR Code retrieved" -ForegroundColor Green
        Write-Host "   QR Code: $($qrCode.qrCode.Substring(0, [Math]::Min(30, $qrCode.qrCode.Length)))..." -ForegroundColor Gray
    } catch {
        Write-Host "   ✗ Get QR code failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 8: Test Get Proposals
if ($groupId) {
    Write-Host "`n8. Test Get Proposals..." -ForegroundColor Yellow
    try {
        $proposals = Invoke-RestMethod -Uri "http://localhost:8000/api/voting/vehicle-group/$groupId" -Method Get -Headers $headers -ErrorAction Stop
        Write-Host "   ✓ Get proposals successful" -ForegroundColor Green
        Write-Host "   Found $($proposals.Count) proposals" -ForegroundColor Gray
    } catch {
        Write-Host "   ✗ Get proposals failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 9: Test Get Payments
Write-Host "`n9. Test Get Payments..." -ForegroundColor Yellow
try {
    $payments = Invoke-RestMethod -Uri "http://localhost:8000/api/payment/payments/user/$userId" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "   ✓ Get payments successful" -ForegroundColor Green
    Write-Host "   Found $($payments.Count) payments" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Get payments failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 10: Test Get Schedules
Write-Host "`n10. Test Get Schedules..." -ForegroundColor Yellow
try {
    $schedules = Invoke-RestMethod -Uri "http://localhost:8000/api/booking/schedules" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "   ✓ Get schedules successful" -ForegroundColor Green
    Write-Host "   Found $($schedules.Count) vehicle schedules" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Get schedules failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Token saved in variable: `$token" -ForegroundColor White
Write-Host "Headers saved in variable: `$headers" -ForegroundColor White
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Open browser: http://localhost" -ForegroundColor White
Write-Host "2. Login with: coowner@example.com / Coowner@12345" -ForegroundColor White
Write-Host "3. Test UI features in the frontend" -ForegroundColor White
Write-Host "4. Check DOCUMENTATION.md for detailed guides" -ForegroundColor White
Write-Host ""

