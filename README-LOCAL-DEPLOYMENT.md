# Local Deployment Guide

This guide explains how to run the Gateway and Backend API services locally.

## Prerequisites

- **Node.js** (v18 or higher) - Required for Backend API
- **Go** (v1.21 or higher) - Required for Gateway (or use Docker)
- **PostgreSQL** (optional) - If you need database connectivity
- **Docker** (optional) - Alternative way to run services

## Quick Start

### Option 1: Using PowerShell Script (Windows)

```powershell
.\start-local.ps1
```

### Option 2: Using Bash Script (Linux/Mac)

```bash
chmod +x start-local.sh
./start-local.sh
```

### Option 3: Using Docker Compose

```bash
docker-compose -f docker-compose.local.yml up
```

### Option 4: Manual Start

#### Backend API

```bash
cd backend-api
npm install
cp .env.example .env
# Edit .env with your database URL
npm run dev
```

Backend API will run on: `http://localhost:4000`

#### Gateway

```bash
cd gateway
go build -o gateway main.go
# Create .env file (see gateway/.env.example)
export PORT=3010
export BACKEND_API_URL=http://localhost:4000
./gateway
```

Gateway will run on: `http://localhost:3010`

## Environment Variables

### Backend API (.env)

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
SHOPIFY_API_KEY=your_key_here
SHOPIFY_STORE_URL=https://your-store.myshopify.com
```

### Gateway (.env)

```env
PORT=3010
BACKEND_API_URL=http://localhost:4000
POSTGREST_URL=http://localhost:3000
MCP_SERVICE_URL=http://localhost:5000
WORKER_SERVICE_URL=http://localhost:6000
API_KEY=your_api_key_here  # Optional, leave empty to disable
```

## Service Endpoints

Once running:

- **Backend API**: http://localhost:4000
  - Health: http://localhost:4000/health
  - Routes: `/orders`, `/integrations`, `/workflows`, `/analytics`

- **Gateway**: http://localhost:3010
  - Routes to Backend API: `/api/*` → Backend API
  - Routes to PostgREST: `/rest/*` → PostgREST
  - Routes to MCP Service: `/mcp/*` → MCP Service
  - Routes to Worker Service: `/worker/*` → Worker Service

## Troubleshooting

### Go Not Installed

If Go is not installed, you have two options:

1. **Install Go**: Download from https://golang.org/dl/
2. **Use Docker**: Run `docker-compose -f docker-compose.local.yml up`

### Port Already in Use

If ports 4000 or 3010 are already in use:

1. Change the `PORT` in the respective `.env` files
2. Update `BACKEND_API_URL` in gateway `.env` to match

### Database Connection Issues

If you don't have a database set up:

1. The Backend API will still start but database operations will fail
2. You can run without a database for testing the API structure
3. Set `DATABASE_URL` to a dummy value or comment it out

## Development Mode

- Backend API uses `nodemon` for auto-reload (run `npm run dev`)
- Gateway needs to be rebuilt after changes (run `go build` again)

## Stopping Services

- **PowerShell/Bash scripts**: Press `Ctrl+C`
- **Docker Compose**: Run `docker-compose -f docker-compose.local.yml down`
- **Manual**: Stop the processes (Ctrl+C in their terminals)

