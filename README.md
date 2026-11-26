# Prithvi Grid 🌱

> **Smart Compost Monitoring & Solid Waste Management (SWM) Compliance Platform**

Prithvi Grid is an end-to-end IoT + AI platform that enables Urban Local Bodies (ULBs) and their allied waste-management entities to:

- **Monitor** decentralised compost pits (DWCC / IMC boxes) in real time via LoRa/MQTT sensor nodes
- **Detect** acid-crash events, methane spikes, anaerobic conditions and hardware tampering automatically
- **Verify** citizen photo submissions and safai-mitra field reports with an AI cross-checking pipeline
- **Predict** odor complaints 4 hours in advance using micro-climate ML models
- **Administer** fleet assets, staff assignments, and SWM compliance dashboards from a central HQ portal

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRITHVI GRID PLATFORM                              │
│                                                                             │
│   ┌─────────────┐   MQTT/LoRa   ┌──────────────────────┐                  │
│   │ Sensor Node │──────────────▶│   @prithvi/api        │                  │
│   │ (ESP32/Pi)  │               │   Node.js + Express   │                  │
│   └─────────────┘               │   Socket.IO  │ REST   │                  │
│                                 └──────┬───────┴────────┘                  │
│   ┌─────────────┐   HTTPS/WS           │                                   │
│   │ Citizen PWA │──────────────────────┤   ┌──────────────────────────┐   │
│   │ @prithvi/   │                      │   │    Python AI Services    │   │
│   │    app      │                      │   │  ┌──────────────────┐   │   │
│   └─────────────┘                      ├──▶│  │ Sanjivani Engine │   │   │
│                                         │   │  │  (FastAPI + ML)  │   │   │
│   ┌─────────────┐   HTTPS (restricted)  │   │  └──────────────────┘   │   │
│   │  HQ Portal  │──────────────────────┘   │  ┌──────────────────┐   │   │
│   │ @prithvi/   │                           │  │  Odor Predictor  │   │   │
│   │    hq       │                           │  │  (Prophet/LSTM)  │   │   │
│   └─────────────┘                           │  └──────────────────┘   │   │
│                                             └──────────────────────────┘   │
│              ┌──────────────────┐   ┌────────────────────────────┐         │
│              │   MongoDB Atlas  │   │   Redis (pub/sub + cache)  │         │
│              │  (primary store) │   │   + BullMQ job queues      │         │
│              └──────────────────┘   └────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘

  Subdomains
  ──────────────────────────────────────────────────────────────────────────
  api.prithvigrid.com   ──▶  @prithvi/api   (Node.js REST + Socket.IO)
  app.prithvigrid.com   ──▶  @prithvi/app   (React PWA — public facing)
  hq.prithvigrid.com    ──▶  @prithvi/hq    (React — IP-restricted admin)
```

---

## Subdomains & Packages

| Subdomain | Package | Description |
|---|---|---|
| `api.prithvigrid.com` | `@prithvi/api` | Core REST API + real-time Socket.IO server. Handles telemetry ingestion, AI orchestration, verification pipeline, alerts, and asset management. |
| `app.prithvigrid.com` | `@prithvi/app` | Citizen-facing Progressive Web App. Safai Mitras log pickups, upload verification photos, view their route & box status, and receive push notifications. |
| `hq.prithvigrid.com` | `@prithvi/hq` | IP-restricted HQ dashboard for Supreme Head and BWG Managers. Shows live telemetry, Sanjivani alerts, compliance KPIs, odor-risk maps, and fleet management. |

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20.x | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) |
| pnpm | ≥ 9.x | `npm install -g pnpm` |
| Python | ≥ 3.11 | Required for AI microservices in `packages/ai-services` |
| MongoDB Atlas | Any | Free M0 cluster works for dev; M10+ for production |
| Redis | ≥ 7.x | Local via Docker or Redis Cloud |
| Docker (optional) | ≥ 24.x | For fully containerised local dev via `infra/docker-compose.yml` |

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/prithvi-grid.git
cd prithvi-grid
```

### 2. Install dependencies

```bash
# Install pnpm if not already present
npm install -g pnpm@latest

# Install all workspace dependencies from root
pnpm install
```

### 3. Configure environment variables

Each package has its own `.env` file. Copy the example files and fill in your values:

```bash
cp packages/api/.env.example   packages/api/.env
cp packages/app/.env.example   packages/app/.env
cp packages/hq/.env.example    packages/hq/.env
```

**Key variables for `packages/api/.env`:**

```env
PORT=3001
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/prithvi_grid?retryWrites=true&w=majority
REDIS_URL=redis://localhost:6379
JWT_SECRET=<your-256-bit-secret>
SANJIVANI_AI_URL=http://localhost:8001
ODOR_AI_URL=http://localhost:8002
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 4. Start local dev (with Docker Compose for infra)

```bash
# Start MongoDB + Redis via Docker
docker compose -f infra/docker-compose.yml up mongodb redis -d

# Start all three packages concurrently
pnpm dev
```

Or start packages individually:

```bash
pnpm dev:api   # api.prithvigrid.com → localhost:3001
pnpm dev:app   # app.prithvigrid.com → localhost:5173
pnpm dev:hq    # hq.prithvigrid.com  → localhost:5174
```

### 5. Build for production

```bash
pnpm build:all
```

---

## Project Structure

```
prithvi-grid/
├── package.json            # Root monorepo config
├── pnpm-workspace.yaml     # pnpm workspace definition
├── .gitignore
├── README.md
│
├── packages/
│   ├── api/                # @prithvi/api — Express + Socket.IO backend
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   │   ├── sanjivaniClient.ts
│   │   │   │   ├── odorClient.ts
│   │   │   │   └── verificationQueue.ts
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── .env.example
│   │
│   ├── app/                # @prithvi/app — Citizen PWA (React + Vite)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   └── .env.example
│   │
│   ├── hq/                 # @prithvi/hq — Admin HQ Portal (React + Vite)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── shared/             # @prithvi/shared — shared TypeScript types
│       └── src/
│           └── index.ts
│
├── infra/
│   ├── docker-compose.yml
│   └── nginx/
│       ├── api.prithvigrid.com.conf
│       ├── app.prithvigrid.com.conf
│       └── hq.prithvigrid.com.conf
│
└── docs/
    ├── API.md
    └── DATABASE.md
```

---

## Architecture Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Transport** | MQTT (LoRa gateway), HTTPS, WebSocket | Sensor data ingestion & real-time push |
| **API Server** | Node.js 20, Express 5, Socket.IO 4 | REST endpoints + live telemetry broadcast |
| **Job Queues** | BullMQ + Redis | Async verification, AI calls, alert dispatch |
| **Primary DB** | MongoDB Atlas | All documents, time-series telemetry lake |
| **Cache / PubSub** | Redis 7 | Session tokens, live metric cache, event bus |
| **AI Services** | Python 3.11, FastAPI, scikit-learn / Prophet | Sanjivani health engine, odor predictor |
| **Citizen App** | React 18, Vite, Workbox PWA | Offline-capable field worker app |
| **Admin HQ** | React 18, Vite, Recharts, Mapbox GL | Real-time ops dashboard (IP-restricted) |
| **Notifications** | Twilio WhatsApp + Web Push | Alerts to Safai Mitras & BWG Managers |
| **Hosting** | nginx reverse proxy + SSL | api / app / hq subdomains |

---

## License

Proprietary — All rights reserved © Prithvi Grid.
