# Script to create test users: Admin, Staff, and CoOwner
# This script uses the auth-service API to create test accounts

Write-Host "=== Creating Test Users ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000"
$gatewayUrl = "$baseUrl/api/auth"

# Test users to create
$testUsers = @(
    @{
        Email = "admin@example.com"
        Password = "Admin@12345"
        FirstName = "System"
        LastName = "Admin"
        Roles = @("Admin")
    },
    @{
        Email = "staff@example.com"
        Password = "Staff@12345"
        FirstName = "Test"
        LastName = "Staff"
        Roles = @("Staff")
    },
    @{
        Email = "coowner@example.com"
        Password = "Coowner@12345"
        FirstName = "Test"
        LastName = "CoOwner"
        Roles = @("CoOwner")
    }
)

# Function to create user via seed-user endpoint
function Create-TestUser {
    param(
        [string]$Email,
        [string]$Password,
        [string]$FirstName,
        [string]$LastName,
        [string[]]$Roles
    )

    try {
        Write-Host "Creating user: $Email..." -ForegroundColor Yellow
        
        $body = @{
            email = $Email
            password = $Password
            firstName = $FirstName
            lastName = $LastName
            roles = $Roles
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$gatewayUrl/seed-user" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
        
        Write-Host "  [OK] User created successfully" -ForegroundColor Green
        Write-Host "  Email: $($response.email)" -ForegroundColor Gray
        Write-Host "  Roles: $($response.roles -join ', ')" -ForegroundColor Gray
        return $true
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            Write-Host "  [WARNING] Seed endpoint is disabled in production. Trying registration..." -ForegroundColor Yellow
            
            # Try registration instead
            try {
                $registerBody = @{
                    email = $Email
                    password = $Password
                    confirmPassword = $Password
                    firstName = $FirstName
                    lastName = $LastName
                } | ConvertTo-Json

                $registerResponse = Invoke-RestMethod -Uri "$gatewayUrl/register" -Method Post -Body $registerBody -ContentType "application/json" -ErrorAction Stop
                
                Write-Host "  [OK] User registered successfully (default role: CoOwner)" -ForegroundColor Green
                Write-Host "  Email: $Email" -ForegroundColor Gray
                
                # If user needs different role, we'll need to use role assignment endpoint
                if ($Roles -notcontains "CoOwner") {
                    Write-Host "  [INFO] Note: User registered with CoOwner role. To change role, use role assignment endpoint." -ForegroundColor Yellow
                }
                return $true
            }
            catch {
                Write-Host "  [ERROR] Registration failed: $($_.Exception.Message)" -ForegroundColor Red
                if ($_.Exception.Response) {
                    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                    $responseBody = $reader.ReadToEnd()
                    Write-Host "  Response: $responseBody" -ForegroundColor Red
                }
                return $false
            }
        }
        else {
            Write-Host "  [ERROR] Failed: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "  Response: $responseBody" -ForegroundColor Red
            }
            return $false
        }
    }
}

# Check if services are running
Write-Host "1. Checking if auth service is accessible..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body (@{ email = "test"; password = "test" } | ConvertTo-Json) -ContentType "application/json" -ErrorAction SilentlyContinue
    Write-Host "   [OK] Auth service is accessible" -ForegroundColor Green
}
catch {
    Write-Host "   [WARNING] Could not reach auth service. Make sure services are running:" -ForegroundColor Yellow
    Write-Host "   docker compose up -d" -ForegroundColor Gray
    Write-Host ""
}

# Create test users
Write-Host ""
Write-Host "2. Creating test users..." -ForegroundColor Yellow
$successCount = 0
$failCount = 0

foreach ($user in $testUsers) {
    Write-Host ""
    if (Create-TestUser -Email $user.Email -Password $user.Password -FirstName $user.FirstName -LastName $user.LastName -Roles $user.Roles) {
        $successCount++
    } else {
        $failCount++
    }
}

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Successfully created: $successCount users" -ForegroundColor Green
Write-Host "Failed: $failCount users" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

Write-Host ""
Write-Host "=== Test User Credentials ===" -ForegroundColor Cyan
Write-Host ""
foreach ($user in $testUsers) {
    Write-Host "Email: $($user.Email)" -ForegroundColor Yellow
    Write-Host "Password: $($user.Password)" -ForegroundColor Yellow
    Write-Host "Roles: $($user.Roles -join ', ')" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Test login with these credentials at: http://localhost:5173" -ForegroundColor Gray
Write-Host "2. Or use PowerShell to test login:" -ForegroundColor Gray
Write-Host ""
Write-Host '   $loginBody = @{ email = "admin@example.com"; password = "Admin@12345" } | ConvertTo-Json' -ForegroundColor DarkGray
Write-Host '   Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"' -ForegroundColor DarkGray
Write-Host ""

