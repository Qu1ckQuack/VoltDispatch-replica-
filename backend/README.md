# VoltDispatch — Backend

Technician Management System API built with NestJS (modular monolith).

## Tech Stack

- **Framework:** NestJS 11
- **ORM:** Prisma 7 (PostgreSQL via Supabase)
- **Auth:** JWT (access + refresh with rotation)
- **Cache:** Redis (also used for WebSocket pub/sub + live location)
- **Queue:** BullMQ (notifications, SLA timers)
- **Real-time:** WebSocket (`ws` or Socket.IO) + Redis adapter
- **Storage:** Supabase Storage / S3
- **CI/CD:** GitHub Actions → Docker → Oracle Cloud VM

## Project Structure

```
src/
├── modules/
│   ├── auth/              JWT issuance/refresh, bcrypt, guards
│   ├── users/             Base identity, role assignment
│   ├── dealers/           Dealer profiles
│   ├── coordinators/      Coordinator profiles
│   ├── technicians/       Technician profiles
│   ├── customers/         Customer profiles
│   ├── work-orders/       State machine, status history (core domain)
│   ├── locations/         WebSocket gateway, Redis pub/sub, position cache
│   ├── notifications/     BullMQ producer, email/LINE adapter
│   ├── media/             Image upload, object storage adapter
│   ├── ratings/           Post-completion ratings
│   ├── reporting/         HQ KPI aggregation, SLA breach detection
│   └── common/            Shared guards, interceptors, validation pipes
├── generated/prisma/      Prisma Client (auto-generated)
└── main.ts
```

## Prerequisites

- Node.js 22+
- PostgreSQL (Supabase free tier)
- Redis (Docker)

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Generate Prisma client
npx prisma generate

# Run migrations (once DB is available)
npx prisma migrate dev

# Start development server
npm run start:dev
```

## Commands

```bash
npm run build        # Production build
npm run lint         # Lint & fix
npm test             # Unit tests
npm run test:e2e     # E2E tests
npm run start:prod   # Start production
```

## Architecture

See [`../Architecture.md`](../Architecture.md) for the full system design, roles, state machine, and deployment plan.
