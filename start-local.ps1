# PowerShell script to start Gateway and Backend API locally

Write-Host "Starting Backend API and Gateway locally..." -ForegroundColor Green

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if Go is installed (for gateway)
$goInstalled = Get-Command go -ErrorAction SilentlyContinue

# Start Backend API
Write-Host "`n[1/2] Starting Backend API on port 4000..." -ForegroundColor Yellow
Set-Location backend-api

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Backend API dependencies..." -ForegroundColor Cyan
    npm install
}

# Create .env if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Cyan
    Copy-Item .env.example .env -ErrorAction SilentlyContinue
    Write-Host "Please update backend-api/.env with your database connection string" -ForegroundColor Yellow
}

# Start Backend API in background
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:PORT = "4000"
    npm run dev
}

Set-Location ..

# Start Gateway
Write-Host "`n[2/2] Starting Gateway on port 3010..." -ForegroundColor Yellow
Set-Location gateway

if ($goInstalled) {
    # Build and run with Go
    Write-Host "Building Gateway..." -ForegroundColor Cyan
    go build -o gateway.exe main.go
    
    # Create .env if it doesn't exist
    if (-not (Test-Path ".env")) {
        Write-Host "Creating .env file from .env.example..." -ForegroundColor Cyan
        Copy-Item .env.example .env -ErrorAction SilentlyContinue
    }
    
    # Load .env variables
    if (Test-Path ".env") {
        Get-Content .env | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
                [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
    }
    
    $env:PORT = "3010"
    $env:BACKEND_API_URL = "http://localhost:4000"
    
    Write-Host "`nGateway and Backend API are starting..." -ForegroundColor Green
    Write-Host "Backend API: http://localhost:4000" -ForegroundColor Cyan
    Write-Host "Gateway: http://localhost:3010" -ForegroundColor Cyan
    Write-Host "`nPress Ctrl+C to stop both services" -ForegroundColor Yellow
    
    # Run gateway in foreground (will block)
    .\gateway.exe
} else {
    Write-Host "`nGo is not installed. Gateway cannot be built." -ForegroundColor Red
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  1. Install Go from https://golang.org/dl/" -ForegroundColor White
    Write-Host "  2. Use Docker: docker-compose -f docker-compose.local.yml up" -ForegroundColor White
    Write-Host "`nBackend API is running in the background." -ForegroundColor Green
    Write-Host "To view logs: Receive-Job $backendJob" -ForegroundColor Cyan
}

Set-Location ..

