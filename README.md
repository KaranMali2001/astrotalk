# Astrotalk

A real-time astrologer consultation platform — users browse professionals by category, top up a wallet, and start pay-per-minute voice/video calls billed live as the call runs.

Built as three independent services: a **Next.js** frontend, a **Node.js/Express** REST API, and a dedicated **uWebSockets.js** signalling service, coordinated through **Redis** and backed by **PostgreSQL** (Prisma).

## Architecture

```
┌──────────────────┐      REST       ┌──────────────────┐
│  nextjs-frontend │ ──────────────▶ │       API        │
│    (Next.js)     │                 │ (Express + Prisma)│
└────────┬─────────┘                 └────────┬─────────┘
         │                                    │
         │ WebSocket                          │  Postgres
         ▼                                    ▼
┌──────────────────┐    Redis pub/sub  ┌──────────────────┐
│    Websocket     │ ◀───────────────▶ │   PostgreSQL      │
│ (uWebSockets.js) │                   └──────────────────┘
└──────────────────┘
         │
         ▼  Agora RTC (voice/video)
```

- **API** — Express + TypeScript, Prisma/PostgreSQL, JWT auth (public + internal service tokens), Redis, rate limiting, Helmet, structured logging (pino). Domain modules: `auth`, `user`, `professional`, `category`, `call`, `feedback`, `admin`.
- **Websocket** — standalone uWebSockets.js service handling call signalling and presence, with a connection manager and message handler. Authenticates via internal JWT and shares state with the API over Redis.
- **nextjs-frontend** — Next.js (App Router, Turbopack) client for browsing, wallet, and in-call UI. Integrates Agora for voice/video.

### Billing model
Calls are metered per minute. A user's `Wallet` is debited over the lifetime of a `Call`; `Transaction` records the ledger and `CallFeedback` captures post-call ratings. Agora webhooks (verified with a shared secret) reconcile call duration.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, TypeScript, Agora RTC SDK |
| API | Node.js, Express, TypeScript, Prisma |
| Real-time | uWebSockets.js |
| Data | PostgreSQL, Redis |
| Auth | JWT (user + internal service tokens) |
| RTC | Agora (voice/video, pay-per-minute) |
| Tooling | pnpm, tsx, esbuild, Docker (Redis), Biome/Prettier |

## Getting started

**Prerequisites:** Node 18+, pnpm, Docker (for Redis), a PostgreSQL database, and an Agora account.

```bash
# 1. Redis (via Docker)
docker run -d --name astrotalk -p 6379:6379 redis:latest

# 2. Install deps per service
cd API && pnpm install
cd ../Websocket && pnpm install
cd ../nextjs-frontend && pnpm install
```

**Environment** — each service reads env from a copied file (`pnpm dev` copies `.env.development` → `.env`). Create your env files from the examples:

```bash
cp API/.env.example            API/.env.development
cp Websocket/.env.example      Websocket/.env.development
cp nextjs-frontend/.env.example nextjs-frontend/.env.dev
```

Fill in your `DATABASE_URL`, `REDIS_URL`, JWT secrets, Agora keys, and the OTP service credentials.

**Database**

```bash
cd API
pnpm generate       # prisma generate
pnpm migrate:dev    # apply migrations
```

**Run** (each in its own terminal)

```bash
cd API && pnpm dev
cd Websocket && pnpm dev
cd nextjs-frontend && pnpm dev
```

## Project structure

```
API/               Express REST API (Prisma, modules per domain)
Websocket/         uWebSockets.js signalling service
nextjs-frontend/   Next.js client
```

## Notes

This is a portfolio/learning build. Secrets are provided only as `.env.example` templates — supply your own credentials.
