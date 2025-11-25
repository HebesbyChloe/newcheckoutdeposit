# Backend API & Gateway Microservices

This repository contains the Backend API and Gateway microservices for the microservices architecture.

## Architecture

- **Backend API** (`backend-api/`): Node.js/Express service handling business logic and complex operations
- **Gateway** (`gateway/`): Go-based API gateway that routes requests to various microservices

## Quick Start

### Prerequisites

- **Node.js** (v18 or higher) - Required for Backend API
- **Go** (v1.21 or higher) - Required for Gateway (or use Docker)
- **PostgreSQL** (optional) - If you need database connectivity
- **Docker** (optional) - Alternative way to run services

### Local Development

#### Option 1: Using PowerShell Script (Windows)

```powershell
.\start-local.ps1
```

#### Option 2: Using Bash Script (Linux/Mac)

```bash
chmod +x start-local.sh
./start-local.sh
```

#### Option 3: Using Docker Compose

```bash
docker-compose -f docker-compose.local.yml up
```

#### Option 4: Manual Start

**Backend API:**
```bash
cd backend-api
npm install
cp .env.example .env  # Edit with your settings
npm run dev
```
Runs on: `http://localhost:4000`

**Gateway:**
```bash
cd gateway
go build -o gateway main.go
# Create .env file (see gateway/.env.example)
export PORT=3010
export BACKEND_API_URL=http://localhost:4000
./gateway
```
Runs on: `http://localhost:3010`

## Service Endpoints

- **Backend API**: http://localhost:4000
  - Health: http://localhost:4000/health
  - Routes: `/orders`, `/integrations`, `/workflows`, `/analytics`, `/cart`, `/checkout`, `/deposit-plans`, `/deposit-sessions`

- **Gateway**: http://localhost:3010
  - Routes to Backend API: `/api/*` → Backend API
  - Routes to PostgREST: `/rest/*` → PostgREST
  - Routes to MCP Service: `/mcp/*` → MCP Service
  - Routes to Worker Service: `/worker/*` → Worker Service

## Environment Variables

See `README-LOCAL-DEPLOYMENT.md` for detailed environment variable configuration.

## Deployment

Both services are configured for Fly.io deployment:
- Backend API: `backend-api/fly.toml`
- Gateway: `gateway/fly.toml`

## Project Structure

```
.
├── backend-api/          # Node.js backend service
│   ├── src/
│   │   ├── index.js     # Main entry point
│   │   ├── routes/      # API routes
│   │   └── services/    # Business logic services
│   ├── migrations/      # Database migrations
│   └── Dockerfile       # Container configuration
├── gateway/             # Go API gateway
│   ├── main.go          # Main entry point
│   └── Dockerfile       # Container configuration
├── docker-compose.local.yml  # Local Docker setup
└── README-LOCAL-DEPLOYMENT.md  # Detailed local setup guide
```

## Development

- Backend API uses `nodemon` for auto-reload (run `npm run dev`)
- Gateway needs to be rebuilt after changes (run `go build` again)

## License

ISC

