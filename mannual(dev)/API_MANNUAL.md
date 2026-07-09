# VoltDispatch API Reference Manual

## Architecture Overview

```
FE (Next.js :3000) ──REST/JSON──► BE (NestJS :3001) ──Prisma──► PostgreSQL (Supabase)
                    ──WS───────► BE (:3001/ws/locations) ──Redis Pub/Sub──► Real-time
```

**No global API prefix** — all endpoints are at root level (e.g., `/auth/login`, not `/api/v1/auth/login`).

---

## 1. Server Configuration

| Setting | Value | Source |
|---|---|---|
| **Port** | `3001` (env `PORT`) | `backend/.env` |
| **CORS origins** | `ALLOWED_ORIGINS` env (default `http://localhost:3000`) | `main.ts:10-12` |
| **WebSocket adapter** | `WsAdapter` (`@nestjs/platform-ws`) | `main.ts:17` |
| **Rate limiting** | 10 req/sec, 100 req/min (global) | `app.module.ts:34-43` |
| **Validation pipe** | `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` (global) | `app.module.ts:72-77` |
| **Global guard chain** | `JwtAuthGuard` → `RolesGuard` | `common.module.ts` |
| **Global interceptor** | `RlsInterceptor` (row-level security scoping) | `app.module.ts:67-69` |
| **Shutdown hooks** | Enabled | `main.ts:18` |

---

## 2. Authentication Flow

```
  ┌─────────┐                    ┌──────────┐                ┌──────────┐
  │  Login   │  POST /auth/login │ Backend  │  verify hash   │   DB     │
  │  Form    │ ────────────────► │          │ ──────────────► │          │
  │          │ ◄──────────────── │          │ ◄────────────── │          │
  │          │   { accessToken,  │          │   user record   │          │
  │          │     refreshToken, │          │                │          │
  │          │     user }        │          │                │          │
  └─────────┘                    └──────────┘                └──────────┘
```

### Token flow:
1. **Login** → receives `accessToken` (15min) + `refreshToken` (7d)
2. Every Axios request auto-attaches `Authorization: Bearer <accessToken>`
3. On `401` or pre-emptive expiry check → `POST /auth/refresh` obtains new tokens
4. JWT payload (`UserPayload`): `{ sub, email, role, profileId, iat, exp }`
5. Refresh token rotation enabled (old refresh token invalidated on use)

### Auth endpoints:

| Endpoint | Auth | Throttle | Purpose |
|---|---|---|---|
| `POST /auth/login` | `@Public()` | 5/60s | Email + password login → `LoginResponse` |
| `POST /auth/refresh` | `@Public()` | 10/60s | Exchange refresh token → `LoginResponse` |
| `POST /auth/magic-link` | `@Public()` | 5/60s | Customer magic link login → `MagicLinkResponse` |
| `POST /register` | `@Public()` | 3/60s | Self-registration (pending approval) → `{ message }` |

---

## 3. Complete REST Endpoint Catalog

### 3.1 Health & Status

| Method | Path | Auth | Roles | FE file |
|---|---|---|---|---|
| `GET` | `/` | JWT | any | — |
| `GET` | `/health` | Public | none | — |

### 3.2 Users

| Method | Path | Roles | Returns | FE function | Used by |
|---|---|---|---|---|---|
| `GET` | `/users` | HQ | `User[]` | `usersApi.list()` | Settings > User Mgmt, People page |
| `POST` | `/users` | HQ | `User` | `usersApi.create(dto)` | Settings > Create User |
| `GET` | `/users/:id` | HQ | `User` | `usersApi.get(id)` | — |
| `PATCH` | `/users/:id` | HQ | `User` | `usersApi.update(id, dto)` | — |
| `DELETE` | `/users/:id` | HQ | `void` | `usersApi.remove(id)` | — |
| `PATCH` | `/users/:id/deactivate` | HQ | `User` | `usersApi.deactivate(id)` | Settings > User Mgmt |
| `POST` | `/users/:id/reset-password` | HQ | `User` | `usersApi.resetPassword(id, pw)` | Settings > Reset Password |
| `PUT` | `/users/me/avatar` | any | `{ url }` | (no FE call) | — |
| `GET` | `/users/me/avatar` | any | `{ url }` | (no FE call) | — |
| `DELETE` | `/users/me/avatar` | any | `void` | (no FE call) | — |

### 3.3 Dealers

| Method | Path | Roles | FE file |
|---|---|---|---|
| `POST` | `/dealers` | HQ | `dealersApi.create()` (unused) |
| `GET` | `/dealers` | HQ | `dealersApi.list()` (unused) |
| `GET` | `/dealers/me` | DEALER | (no FE call) |
| `GET` | `/dealers/by-user/:userId` | HQ | (no FE call) |
| `GET` | `/dealers/:id` | HQ | `dealersApi.get(id)` (unused) |
| `PATCH` | `/dealers/:id` | HQ | `dealersApi.update(id, dto)` (unused) |
| `DELETE` | `/dealers/:id` | HQ | `dealersApi.remove(id)` (unused) |

### 3.4 Coordinators

| Method | Path | Roles | FE file |
|---|---|---|---|
| `POST` | `/coordinators` | HQ | `coordinatorsApi.create()` (unused) |
| `GET` | `/coordinators` | HQ | `coordinatorsApi.list()` (unused) |
| `GET` | `/coordinators/me` | COORDINATOR | (no FE call) |
| `PATCH` | `/coordinators/me` | COORDINATOR | (no FE call) |
| `GET` | `/coordinators/by-user/:userId` | HQ | (no FE call) |
| `GET` | `/coordinators/:id` | HQ | (unused) |
| `PATCH` | `/coordinators/:id` | HQ | (unused) |
| `DELETE` | `/coordinators/:id` | HQ | (unused) |

### 3.5 Technicians

| Method | Path | Roles | FE function | Used by |
|---|---|---|---|---|
| `GET` | `/technicians` | HQ | `techniciansApi.list()` | Technicians page, Queue > Assign, People page |
| `GET` | `/technicians/map` | HQ, COORDINATOR, TECHNICIAN | `techniciansApi.mapList(role)` | Live Map page |
| `GET` | `/technicians/me` | TECHNICIAN | (used in technicians page status toggle) | — |
| `GET` | `/technicians/by-user/:userId` | HQ | (no FE call) | — |
| `GET` | `/technicians/:id` | HQ | `techniciansApi.get(id)` | — |
| `POST` | `/technicians` | HQ | `techniciansApi.create(dto)` | Technicians page > Create |
| `PATCH` | `/technicians/:id` | HQ | `techniciansApi.update(id, dto)` | Technicians page > Edit |
| `DELETE` | `/technicians/:id` | HQ | `techniciansApi.remove(id)` | Technicians page > Remove |
| `PATCH` | `/technicians/me/status` | TECHNICIAN | `techniciansApi.updateStatus(dto)` | Technicians page > Status toggle |

### 3.6 Customers

| Method | Path | Roles | FE function | Used by |
|---|---|---|---|---|
| `GET` | `/customers` | HQ, DEALER | `customersApi.list()` | Customers page, People page, Create Order modal |
| `GET` | `/customers/:id` | HQ, DEALER | `customersApi.get(id)` | Customer detail modal |
| `POST` | `/customers` | HQ, DEALER | `customersApi.create(dto)` | Customers page, Create Order modal (inline) |
| `PATCH` | `/customers/:id` | HQ, DEALER | `customersApi.update(id, dto)` | Customers page > Edit |
| `DELETE` | `/customers/:id` | HQ, DEALER | `customersApi.remove(id)` | Customers page > Delete |

### 3.7 Devices

| Method | Path | Roles | FE function | Used by |
|---|---|---|---|---|
| `GET` | `/devices?dealerId=` | DEALER, HQ | `devicesApi.list()` | Create Order modal |
| `GET` | `/devices/:id` | DEALER, HQ | `devicesApi.get(id)` | — |
| `POST` | `/devices` | DEALER | `devicesApi.create(dto)` | Create Order modal (inline) |
| `PATCH` | `/devices/:id` | DEALER, HQ | `devicesApi.update(id, dto)` | — |
| `DELETE` | `/devices/:id` | DEALER, HQ | `devicesApi.remove(id)` | — |

### 3.8 Work Orders (core state machine)

| Method | Path | Roles | State transition | FE function |
|---|---|---|---|---|
| `GET` | `/work-orders?status=&subDistrict=&...` | ALL 5 roles | — | `workOrdersApi.list(query)` |
| `GET` | `/work-orders/:id` | ALL 5 roles | — | `workOrdersApi.get(id)` |
| `POST` | `/work-orders` | DEALER | → REQUESTED | `workOrdersApi.create(dto)` |
| `PATCH` | `/work-orders/:id/assign` | COORDINATOR | REQUESTED → ASSIGNED | `workOrdersApi.assign(id, dto)` |
| `PATCH` | `/work-orders/:id/accept` | TECHNICIAN | ASSIGNED → ACCEPTED | `workOrdersApi.accept(id)` |
| `PATCH` | `/work-orders/:id/decline` | TECHNICIAN | ASSIGNED → REQUESTED | `workOrdersApi.decline(id, note?)` |
| `PATCH` | `/work-orders/:id/reschedule` | COORDINATOR | ACCEPTED → RESCHEDULED | `workOrdersApi.reschedule(id, dto)` |
| `PATCH` | `/work-orders/:id/start-travel` | TECHNICIAN | ACCEPTED → EN_ROUTE | `workOrdersApi.startTravel(id)` |
| `PATCH` | `/work-orders/:id/start-work` | TECHNICIAN | EN_ROUTE → IN_PROGRESS | `workOrdersApi.startWork(id)` |
| `PATCH` | `/work-orders/:id/issue` | TECHNICIAN | IN_PROGRESS → ISSUE | `workOrdersApi.reportIssue(id, note?)` |
| `PATCH` | `/work-orders/:id/resolve-issue` | TECHNICIAN | ISSUE → IN_PROGRESS | `workOrdersApi.resolveIssue(id)` |
| `PATCH` | `/work-orders/:id/escalate` | COORDINATOR | ISSUE → ESCALATED | `workOrdersApi.escalate(id, note?)` (unused) |
| `PATCH` | `/work-orders/:id/complete` | TECHNICIAN | IN_PROGRESS → COMPLETED | `workOrdersApi.complete(id)` |
| `PATCH` | `/work-orders/:id/cancel` | DEALER, HQ, TECHNICIAN, CUSTOMER | various → CANCELLED | `workOrdersApi.cancel(id, note?)` |

**State machine** (defined in `backend/src/modules/work-orders/services/state-machine.service.ts`):

```
REQUESTED ──► ASSIGNED ──► ACCEPTED ──► EN_ROUTE ──► IN_PROGRESS ──► COMPLETED
  │              │            │                            │
  │              ├── CANCELLED│                            ├── ISSUE ──► ESCALATED
  │              │            │                            │     │
  └── CANCELLED  └── REQUESTED├── RESCHEDULED ──► ACCEPTED│     └── IN_PROGRESS
                               └── CANCELLED
```

### 3.9 Media (Images)

| Method | Path | Roles | FE function |
|---|---|---|---|
| `POST` | `/work-orders/:id/images` | TECHNICIAN | `mediaApi.upload(id, dto, file)` (unused) |
| `GET` | `/work-orders/:id/images` | HQ, DEALER, COORDINATOR, TECHNICIAN | `mediaApi.list(id)` (unused) |
| `DELETE` | `/work-orders/:id/images/:imageId` | TECHNICIAN, HQ | `mediaApi.remove(id, imgId)` (unused) |

### 3.10 Ratings

| Method | Path | Roles | FE function |
|---|---|---|---|
| `POST` | `/work-orders/:id/ratings` | CUSTOMER | `ratingsApi.create(id, dto)` (unused) |
| `GET` | `/work-orders/:id/ratings` | HQ, DEALER, COORDINATOR, TECHNICIAN | `ratingsApi.get(id)` (unused) |
| `DELETE` | `/work-orders/:id/ratings/:ratingId` | HQ | `ratingsApi.remove(id, rId)` (unused) |

### 3.11 Notifications

| Method | Path | Roles | FE function |
|---|---|---|---|
| `GET` | `/notifications?status=&page=&limit=` | HQ, COORDINATOR | `notificationsApi.list()` (unused) |
| `GET` | `/notifications/:id` | HQ, COORDINATOR | `notificationsApi.get(id)` (unused) |

### 3.12 Registration (self-signup approval)

| Method | Path | Roles | FE function | Used by |
|---|---|---|---|---|
| `GET` | `/register/requests` | HQ, COORDINATOR | `registrationApi.listPending()` | Settings > Pending Approvals |
| `POST` | `/register/approve/:id` | HQ, COORDINATOR | `registrationApi.approve(id)` | Settings > Pending Approvals |
| `POST` | `/register/reject/:id` | HQ, COORDINATOR | `registrationApi.reject(id)` | Settings > Pending Approvals |

### 3.13 Reporting

| Method | Path | Roles | FE function | Used by |
|---|---|---|---|---|
| `GET` | `/reporting/overview` | ALL | `reportingApi.overview()` | Dashboard, Reports |
| `GET` | `/reporting/summary?period=` | HQ | `reportingApi.summary(query)` | Reports |
| `GET` | `/reporting/search?q=` | HQ | `reportingApi.search(query)` | (unused) |

---

## 4. WebSocket — Real-Time Location Tracking

### Connection
```
ws://localhost:3001/ws/locations?token=<jwt_access_token>
```
Alternative: `Sec-WebSocket-Protocol` header with token.

### Auth verification
`WsAuthService.verify()` decodes JWT, checks role. Invalid/missing → close code `4001`.

### Client → Server messages

| Event | Who sends | Payload | Effect |
|---|---|---|---|
| `position:update` | TECHNICIAN only | `{ lat, lng, orderId? }` | Updates GPS in Redis, broadcasts to `room:order:<orderId>`; rate-limited per client, min 50m movement threshold |
| `subscribe` | any | `{ room: string }` | Joins a room (access validated) |
| `unsubscribe` | any | `{ room: string }` | Leaves a room |

### Server → Client messages

| Event | Payload | Trigger |
|---|---|---|
| `connected` | `{ userId, role }` | After successful WS handshake |
| `technician:position` | `{ technicianId, lat, lng, timestamp }` | Technician position update → broadcast to room |
| `hq:activity` | `{ type, orderId, fromStatus, toStatus, ... }` | Any work order status change → redis `hq:activities` channel |
| `subscribed` | `{ room }` | After successful room join |
| `error` | `{ message, details? }` | Validation failure |
| `reconnect_hint` | `{ reconnectAfterMs }` | Server shutdown |

### Auto-subscriptions
- **Technicians**: auto-joined to `room:order:<orderId>` for their assigned orders
- **HQ**: additionally joined to `room:hq:activities`

### Rate limits
- Per-client position updates: max every **5 seconds**
- Movement threshold: **50 meters** minimum to broadcast
- Max payload: **2048 bytes**

---

## 5. Row-Level Scoping (RLS)

The `RlsInterceptor` (global) + `ScopingService` automatically filter queries by role:

| Role | Scope filter | Effect |
|---|---|---|
| **HQ** | `{}` | Sees everything |
| **DEALER** | `{ dealerId: user.profileId }` | Only their own work orders & customers |
| **COORDINATOR** | `{ department: user.department }` | Only matching department |
| **TECHNICIAN** | `{ technicianId: user.profileId }` | Only their assigned orders |
| **CUSTOMER** | `{ customerId: user.id }` | Only their own orders |

---

## 6. Frontend Architecture

### API Client Layer

```
lib/api/
├── client.ts          ← Axios instance (base URL, interceptors)
├── types.ts           ← All TS interfaces & enums
├── jwt.ts             ← Token expiry check
├── auth.ts            ← /auth/*
├── users.ts           ← /users/*
├── technicians.ts     ← /technicians/*
├── customers.ts       ← /customers/*
├── work-orders.ts     ← /work-orders/*
├── devices.ts         ← /devices/*
├── dealers.ts         ← /dealers/*
├── coordinators.ts    ← /coordinators/*
├── media.ts           ← /work-orders/:id/images/*
├── ratings.ts         ← /work-orders/:id/ratings/*
├── notifications.ts   ← /notifications/*
├── reporting.ts       ← /reporting/*
├── registration.ts    ← /register/*
├── locations.ts       ← WebSocket client class
└── index.ts           ← Barrel export
```

### Hook Layer
```
lib/hooks/
├── use-work-orders.ts     ← TanStack Query hooks for all work-order mutations
├── use-customers.ts       ← useQuery + useMutation for customers
├── use-technicians.ts     ← useQuery + useMutation for technicians
├── use-users.ts           ← useQuery + useMutation for users
├── use-devices.ts         ← useQuery for devices
├── use-reporting.ts       ← useQuery for reporting
├── use-location-socket.ts ← WebSocket lifecycle (connect/disconnect/reconnect)
```

### Data flow pattern
```
Page/Component
    │
    ├──► useQuery hook (reads) ──► api client function ──► Axios ──► Backend
    │                                                                    │
    └──► useMutation hook (writes) ──► invalidates query on success ◄────┘
```

### Axios Interceptors (client.ts)
- **Request**: auto-attaches `Authorization: Bearer <token>` from Zustand store
- **Response 401**: attempts 1 retry via `POST /auth/refresh`, updates tokens, replays request; if fails → logs out

---

## 7. Unused API Definitions

These API modules are defined but **not wired to any UI**:

| Module | Endpoints | Status |
|---|---|---|
| `coordinatorsApi` | Full CRUD at `/coordinators` | No hooks created, no page imports |
| `dealersApi` | Full CRUD at `/dealers` | No hooks created, no page imports |
| `mediaApi` | Upload/list/delete at `/work-orders/:id/images` | No hooks created |
| `ratingsApi` | Create/get/delete at `/work-orders/:id/ratings` | No hooks created |
| `notificationsApi` | List/get at `/notifications` | No hooks created |
| `reportingApi.search()` | `GET /reporting/search` | No hook or page usage |
| `workOrdersApi.escalate()` | `PATCH /work-orders/:id/escalate` | Hook exists but unused in pages |

---

## 8. Quick Reference: Common Tasks

### Creating a work order (FE flow)
```
CreateOrderModal → POST /work-orders  → invalidate 'work-orders' query
                   │                      → table refreshes
                   ├── POST /customers (if inline new customer)
                   └── POST /devices (if inline new device)
```

### Technician state progression
```
ASSIGNED  →  ACCEPTED  →  EN_ROUTE  →  IN_PROGRESS  →  COMPLETED
  accept()     startTravel()  startWork()  complete()
```

### Adding a new API call
1. Define function in `lib/api/<module>.ts`
2. Create/mutate hook in `lib/hooks/use-<module>.ts`
3. Use hook in page/component
