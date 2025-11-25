#!/bin/bash

# Bash script to start Gateway and Backend API locally

echo "Starting Backend API and Gateway locally..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Go is installed
GO_INSTALLED=false
if command -v go &> /dev/null; then
    GO_INSTALLED=true
fi

# Start Backend API
echo ""
echo "[1/2] Starting Backend API on port 4000..."
cd backend-api

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing Backend API dependencies..."
    npm install
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env 2>/dev/null || true
    echo "Please update backend-api/.env with your database connection string"
fi

# Start Backend API in background
PORT=4000 npm run dev &
BACKEND_PID=$!

cd ..

# Start Gateway
echo ""
echo "[2/2] Starting Gateway on port 3010..."
cd gateway

if [ "$GO_INSTALLED" = true ]; then
    # Build and run with Go
    echo "Building Gateway..."
    go build -o gateway main.go
    
    # Create .env if it doesn't exist
    if [ ! -f ".env" ]; then
        echo "Creating .env file from .env.example..."
        cp .env.example .env 2>/dev/null || true
    fi
    
    # Load .env variables
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    export PORT=3010
    export BACKEND_API_URL=http://localhost:4000
    
    echo ""
    echo "Gateway and Backend API are starting..."
    echo "Backend API: http://localhost:4000"
    echo "Gateway: http://localhost:3010"
    echo ""
    echo "Press Ctrl+C to stop both services"
    
    # Run gateway in foreground
    ./gateway
    
    # Cleanup on exit
    kill $BACKEND_PID 2>/dev/null
else
    echo ""
    echo "Go is not installed. Gateway cannot be built."
    echo "Options:"
    echo "  1. Install Go from https://golang.org/dl/"
    echo "  2. Use Docker: docker-compose -f docker-compose.local.yml up"
    echo ""
    echo "Backend API is running in the background (PID: $BACKEND_PID)"
    echo "To stop: kill $BACKEND_PID"
fi

cd ..

