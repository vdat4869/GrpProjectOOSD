# Payment Service Build Script
# Builds the backend, database, and Docker containers

param(
    [string]$Environment = "Development",
    [switch]$SkipTests = $false,
    [switch]$SkipDatabase = $false,
    [switch]$SkipDocker = $false,
    [switch]$Clean = $false
)

Write-Host "🚀 Starting Payment Service Build Process..." -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Set error action preference
$ErrorActionPreference = "Stop"

# Clean previous builds if requested
if ($Clean) {
    Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
    if (Test-Path "bin") { Remove-Item -Recurse -Force "bin" }
    if (Test-Path "obj") { Remove-Item -Recurse -Force "obj" }
    if (Test-Path "src/bin") { Remove-Item -Recurse -Force "src/bin" }
    if (Test-Path "src/obj") { Remove-Item -Recurse -Force "src/obj" }
    Write-Host "✅ Clean completed" -ForegroundColor Green
}

# Restore NuGet packages
Write-Host "📦 Restoring NuGet packages..." -ForegroundColor Yellow
Set-Location "src"
dotnet restore PaymentService.csproj
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Package restore failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Packages restored" -ForegroundColor Green

# Build the application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
dotnet build PaymentService.csproj -c Release --no-restore
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Application built successfully" -ForegroundColor Green

# Run tests (if not skipped)
if (-not $SkipTests) {
    Write-Host "🧪 Running tests..." -ForegroundColor Yellow
    dotnet test PaymentService.csproj --no-build --verbosity normal
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Tests failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ All tests passed" -ForegroundColor Green
}

# Publish the application
Write-Host "📦 Publishing application..." -ForegroundColor Yellow
dotnet publish PaymentService.csproj -c Release -o ../publish --no-build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Publish failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Application published" -ForegroundColor Green

Set-Location ".."

# Database setup (if not skipped)
if (-not $SkipDatabase) {
    Write-Host "🗄️ Setting up database..." -ForegroundColor Yellow
    
    # Check if SQL Server is running
    $sqlServerRunning = Get-Service -Name "MSSQL*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
    if (-not $sqlServerRunning) {
        Write-Host "⚠️ SQL Server not running. Please start SQL Server before running database setup." -ForegroundColor Yellow
        Write-Host "You can start SQL Server with: Start-Service MSSQLSERVER" -ForegroundColor Cyan
    } else {
        Write-Host "✅ SQL Server is running" -ForegroundColor Green
        
        # Run database schema
        Write-Host "📋 Applying database schema..." -ForegroundColor Yellow
        sqlcmd -S localhost -E -i "src/Database/database_schema.sql"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Database schema failed" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Database schema applied" -ForegroundColor Green
    }
}

# Docker build (if not skipped)
if (-not $SkipDocker) {
    Write-Host "🐳 Building Docker image..." -ForegroundColor Yellow
    
    # Check if Docker is running
    try {
        docker version | Out-Null
        Write-Host "✅ Docker is running" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        exit 1
    }
    
    # Build Docker image
    docker build -t payment-service:latest .
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Docker image built successfully" -ForegroundColor Green
    
    # Tag for different environments
    if ($Environment -ne "Development") {
        docker tag payment-service:latest payment-service:$Environment
        Write-Host "✅ Tagged image for $Environment environment" -ForegroundColor Green
    }
}

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
$deploymentDir = "deployment"
if (Test-Path $deploymentDir) { Remove-Item -Recurse -Force $deploymentDir }
New-Item -ItemType Directory -Path $deploymentDir | Out-Null

# Copy published files
Copy-Item -Recurse "publish/*" "$deploymentDir/"
Copy-Item "Dockerfile" "$deploymentDir/"
Copy-Item "docker-compose.yml" "$deploymentDir/"
Copy-Item "docker-compose.prod.yml" "$deploymentDir/"

# Copy configuration files
Copy-Item "appsettings.json" "$deploymentDir/"
Copy-Item "appsettings.Development.json" "$deploymentDir/"
if (Test-Path "appsettings.Production.json") {
    Copy-Item "appsettings.Production.json" "$deploymentDir/"
}

# Copy database schema
New-Item -ItemType Directory -Path "$deploymentDir/Database" | Out-Null
Copy-Item "src/Database/database_schema.sql" "$deploymentDir/Database/"

# Create deployment script
$deploymentScript = @"
# Payment Service Deployment Script
# Generated on $(Get-Date)

Write-Host "🚀 Deploying Payment Service..." -ForegroundColor Green

# Set environment
`$env:ASPNETCORE_ENVIRONMENT = "$Environment"

# Start the application
Write-Host "Starting Payment Service..." -ForegroundColor Yellow
dotnet PaymentService.dll

Write-Host "✅ Payment Service deployed successfully!" -ForegroundColor Green
"@

Set-Content -Path "$deploymentDir/deploy.ps1" -Value $deploymentScript

Write-Host "✅ Deployment package created in $deploymentDir" -ForegroundColor Green

# Summary
Write-Host "`n🎉 Build Process Completed Successfully!" -ForegroundColor Green
Write-Host "📁 Deployment package: $deploymentDir" -ForegroundColor Cyan
Write-Host "🐳 Docker image: payment-service:latest" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Review the deployment package in $deploymentDir" -ForegroundColor White
Write-Host "2. Run 'docker-compose up' to start the services" -ForegroundColor White
Write-Host "3. Access the API at http://localhost:5003" -ForegroundColor White
Write-Host "4. View Swagger documentation at http://localhost:5003/swagger" -ForegroundColor White
