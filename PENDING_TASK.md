# Pending Tasks

## ✅ Completed
- [x] Step 1: Data model + migrations (schema written, migration run, custom SQL applied, Prisma client regenerated)
- [x] Step 2: Auth + RBAC/Scoping
- [x] Step 3: WorkOrder Core API + State Machine
  - [x] JWT auth (access 15m + refresh 7d with rotation)
  - [x] bcrypt password hashing (BCRYPT_ROUNDS from env)
  - [x] JwtAuthGuard (global) + RolesGuard + @Public() + @Roles() + @CurrentUser()
  - [x] Users CRUD (HQ only) + deactivation
  - [x] Customer magic-link auth (one-time access_token → JWT)
  - [x] Token revocation (in-memory, Redis deferred to Step 5)
  - [x] Row-level scoping service (ScopingService — app-layer, one chokepoint)
  - [x] Rate limiting (@nestjs/throttler, 5 req/min on /auth/login + /auth/magic-link)
  - [x] Global ValidationPipe (whitelist + forbidNonWhitelisted + transform)
  - [x] ConfigModule (env validation at startup)
  - [x] PrismaService (singleton, @prisma/adapter-pg)

## 🔲 Upcoming (from Architecture.md)

### Step 2: Auth + RBAC/Scoping
- [ ] JWT issuer/refresh service
- [ ] bcrypt password hashing
- [ ] Guards + decorators (`@Roles`, `@CurrentUser`)
- [ ] Customer magic-link auth
- [ ] Row-level scoping policy layer (CASL or custom `ScopedRepository`)
- [ ] Redis deny-list for revoked tokens

### Step 3: WorkOrder Core API + State Machine
- [x] State machine service (validate transitions — all 15 routes defined)
- [x] WorkOrder CRUD + status history recording (prisma.$transaction)
- [x] Coordinator assign/reassign, Technician accept/decline
- [x] Issue/Escalate flow
- [x] SLA deadline tracking (slaDeadline field, partial index from Step 1)
- [x] Row-level scoping fix (profileId in JWT, ScopingService uses profileId)
- [x] Minimal role services (DealersService, TechniciansService, CoordinatorsService)

### Step 4: Backoffice CRUD
- [ ] Dealer module
- [ ] Coordinator module
- [ ] Technician module
- [ ] Customer module
- [ ] Device CRUD

### Step 5: Cache Management (Redis)
- [ ] Redis client integration
- [ ] Location cache
- [ ] Geocoding cache

### Step 6: Queue Management (BullMQ)
- [ ] BullMQ setup
- [ ] Notification producer
- [ ] SLA timer jobs

### Step 7: Real-Time Location Tracker (WebSocket)
- [ ] WS gateway with JWT auth on handshake
- [ ] Redis pub/sub adapter
- [ ] Technician position updates
- [ ] Customer live tracking view

### Step 8: Media Module
- [ ] Object storage adapter (Supabase Storage)
- [ ] Before/after image upload
- [ ] Signed URL generation

### Step 9: Reporting Module
- [ ] HQ KPI aggregation
- [ ] SLA breach detection
- [ ] Materialized view refresh job

### Step 10: Frontend API Integration
- [ ] API client setup
- [ ] Auth pages (login, magic-link)
- [ ] Dashboard pages per role

### Step 11: UI (shadcn/ui)
- [ ] Component library setup
- [ ] Layouts and navigation
- [ ] Work order views
- [ ] Technician map
