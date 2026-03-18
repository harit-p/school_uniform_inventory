# School Uniform Inventory Management System

MVP for Shri Hari Vastra Bhandar — school uniform retail shop (Surat, Gujarat).

## Day 1 — Skeleton

- **Client:** Vite + React, Tailwind CSS, React Router, Zustand-ready
- **Server:** Node.js + Express, MongoDB + Mongoose
- **Models:** School (with UniformPreset), Product, StockTransaction, Bill, Counter

## Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or set `MONGODB_URI`

## Setup

```bash
# From project root
npm run install:all
```

## Run

**Terminal 1 — server (port 3001):**
```bash
npm run dev:server
```

**Terminal 2 — client (port 5173):**
```bash
npm run dev:client
```

Or both at once:
```bash
npm run dev
```

Open http://localhost:5173 — the home page will show API health (server + database).

## Project structure

```
client/     → Vite + React (src/modules, api layer, utils)
server/     → Express API, models, routes
shared/     → Types/constants shared between client and server
```

## Environment

Create **`server/.env`** (or set env vars before starting the server):

- `MONGODB_URI` — MongoDB connection string (e.g. Atlas). If missing, defaults to `mongodb://127.0.0.1:27017/school_uniform`
- `PORT` — server port; defaults to 3001

For MongoDB Atlas, put the URL in `server/.env`. If your password contains `@`, encode it as `%40`.
