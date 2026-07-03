# Concern.md — Security & Design Review

Technician Management System · Consolidated from architecture review, schema design, and security pass

---

## Part 1 — Security Concerns

### 1.1 Authentication & Session
- JWT expiry/rotation policy — short-lived access tokens + refresh rotation, not long-lived tokens
- Customer `access_token` (magic link) needs: expiry, single-work-order scoping, and brute-force protection (long random token, rate-limited lookup on the endpoint that resolves it)
- Password policy + bcrypt cost factor tuning
- Auth validated on WebSocket upgrade handshake, not just REST — and re-validated on sensitive socket events, not assumed to persist for the life of the connection

### 1.2 Authorization / Data Scoping
- Row-level scoping enforcement (Dealer → own orders, Coordinator → department) is still an **open implementation decision** — RLS at the DB layer vs. app-layer guard. If app-layer only, one missed guard on one endpoint leaks cross-dealer data. This is the single highest-leverage security decision left unmade.
- Technician must not be able to query other technicians' assigned orders
- `devices.ip_address` is currently visible to the Technician role per the original spec — confirm this is intentional, not incidental over-exposure of network infrastructure data

### 1.3 Data Protection
- PII at rest: customer name/phone/address, device IP — consider column-level encryption or at minimum strict access logging on `customers` and `devices`
- Before/after images in object storage — signed URLs with expiry, never a permanently public bucket
- `notifications.payload` (JSONB) may contain PII — don't log full payload content in production

### 1.4 API / Transport
- Rate limiting on all public-facing endpoints, especially the customer tracking link (closest thing to an unauthenticated surface)
- Server-side validation of work-order status transitions against the state machine — never trust client-submitted status
- `https://` / `wss://` enforced everywhere, no plaintext fallback

### 1.5 Real-Time Location Tracker
- `Origin` header check on WS upgrade (CSRF-equivalent for sockets)
- Message size limits + per-connection rate limiting to prevent flood
- Live technician location must only be visible to the customer on that technician's *current active* order — not broadcast broadly

### 1.6 Infrastructure
- Secrets management (DB creds, JWT signing key, storage keys) kept out of env files committed to source control
- `work_order_status_history` already covers state-transition audit — extend the same discipline to login attempts and permission denials for incident response

### 1.7 Third-Party Integrations
- LINE / SMS / email provider API keys scoped narrowly, rotated periodically
- Maps API key restricted by domain/referrer and quota-capped, since Google Maps free tier caps don't pool across SKUs — an unrestricted key is also a billing-abuse vector, not just a security one

---

## Part 2 — Design Review: Good vs Bad

### 2.1 Tech Stack

| Good | Bad / Risk |
|---|---|
| NestJS backend + Redis + BullMQ + PostgreSQL is a coherent, well-proven combination for this workload | Original spec listed **"NestJS for frontend"** — not viable; NestJS has no browser runtime. Corrected to Next.js. |
| Reusing Redis for both caching *and* WebSocket pub/sub avoids adding a second piece of infra | Object storage, maps provider, and notification provider were **entirely absent** from the original stack despite being required by the feature list (image upload, live map, email/SMS) |

### 2.2 Roles & Access Model

| Good | Bad / Risk |
|---|---|
| The original visibility/access-control matrix per role (HQ/Dealer/Coordinator/Technician/Customer) was unusually well thought out for a first draft | It was written as if pure RBAC (role → permission) would suffice. In practice several rules are **row-level/ownership scoped** ("Dealer sees only their own orders") — RBAC alone can't express that, and it's still an open implementation item (see §1.2) |

### 2.3 Workflow State Machine

| Good | Bad / Risk |
|---|---|
| The six-stage happy path was clean and directly mapped to real operational stages | No explicit states for **Decline/Reassign, Cancelled, Issue/Disputed, Rescheduled** — all implied by role permissions ("technician can decline," "problem occur") but not modeled, which would have made the HQ "Issue task" KPI and SLA reporting unqueryable without hacky timestamp inference. Addressed in the revised state machine. |

### 2.4 Data Model & Schema

| Good | Bad / Risk |
|---|---|
| Core transactional entities (WorkOrder, Dealer, Technician, Customer, Device) normalized to 3NF — correct call, this is where referential integrity actually matters | A **naive fully-normalized schema with no denormalization anywhere** would have forced an expensive multi-table join on every Coordinator queue load (filter by sub-district before a technician is even assigned) |
| `work_orders.sub_district` denormalized deliberately, with a comment explaining *why* and that it should never be edited post-creation | Denormalizing further, or denormalizing without documenting intent, is how schemas rot — the comment is doing real work here, not decoration |
| JSONB used narrowly (`dealer.contact_info`, `device.metadata`, `notification.payload`) for genuinely variable-shaped data | Using JSONB broadly as a general escape hatch (e.g. for WorkOrder itself) would have defeated the point of normalizing the core tables at all |
| Materialized view for HQ KPIs kept separate from the transactional schema, explicitly *not* wired up until dashboard latency is a felt problem | Building the reporting layer prematurely, or building the transactional tables denormalized "just in case," are both overcorrections — the doc flags this explicitly to prevent either |

### 2.5 Real-Time Location Tracking

| Good | Bad / Risk |
|---|---|
| WebSocket is the right transport choice — genuine bidirectional need (technician pushes position, receives order updates), not just a trendy pick | Original spec named WebSocket but didn't address auth-on-handshake, scaling across nodes, or update frequency — all of which affect battery life, cost, and security surface |
| Redis pub/sub adapter planned in from the start (reusing existing Redis instance) even though single-node may be sufficient at launch | Skipping this and bolting it on later after multi-node deployment is a common, painful WebSocket migration mistake |

### 2.6 Notification System

| Good | Bad / Risk |
|---|---|
| BullMQ reused for both queue management and notification delivery — no extra infra | SendGrid was the implicit default in most people's mental model but its permanent free tier was retired in 2025 — would have been an unpleasant surprise mid-build. Resend/Brevo picked instead. |
| LINE Official Account identified as a genuinely free, higher-reach channel than SMS for a Thailand-based user base | SMS was treated as if it had a real free tier — it doesn't, anywhere, ever (carrier costs are real) |

### 2.7 Implementation Order

| Good | Bad / Risk |
|---|---|
| "Design project structure (modular monolith)" as step 0 is the right instinct — define boundaries before writing code | Original order placed **Auth (3) and RBAC (4) after Backend API + Backoffice CRUD (1–2)** — building unprotected endpoints first and retrofitting guards later is a known source of shipped, unguarded routes. Moved earlier in the revised order. |

### 2.8 Documentation & Process

| Good | Bad / Risk |
|---|---|
| Willingness to formalize decisions into a living architecture doc rather than keeping them in chat/tribal knowledge | Several decisions (customer auth model, department scoping strictness, image retention policy) are still open and undocumented anywhere except this review — they need owners and deadlines, not just a list |

---

## Part 3 — Priority Call

**Launch-blockers (must resolve before production):**
- Row-level scoping enforcement mechanism (§1.2 / §2.2)
- Server-side state-transition validation (§1.4)
- Secrets management (§1.6)
- Signed URLs for image storage (§1.3)

**Hardening pass (can follow shortly after launch, not before):**
- Column-level encryption for PII
- Full audit logging of auth events
- Rate limiting tuning based on real traffic
- WebSocket message size/rate limits refined with real usage data