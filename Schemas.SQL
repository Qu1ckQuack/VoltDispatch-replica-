-- ============================================================================
-- Technician Management System — PostgreSQL Schema
-- Version 0.1
--
-- Design approach:
--   - Core transactional tables (users, work_orders, etc.) are normalized
--     to 3NF — referential integrity matters here, duplication doesn't.
--   - work_orders.sub_district is an INTENTIONAL denormalization (copied
--     from customer address at creation time) so the Coordinator queue can
--     filter by area without a join, before a technician is even assigned.
--   - JSONB is used narrowly for genuinely variable-shaped data
--     (dealer contact info, device metadata, notification payloads) —
--     not as a general-purpose escape hatch.
--   - Live technician location is NOT modeled here — it lives in Redis
--     (high-write, ephemeral, no relational integrity need). Only
--     last-known position is synced back to `technicians` periodically.
--   - A materialized view for the HQ KPI dashboard is included at the
--     bottom — the reporting read path should not hit the normalized
--     tables directly once volume grows.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('HQ', 'DEALER', 'COORDINATOR', 'TECHNICIAN');

CREATE TYPE technician_status AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

CREATE TYPE work_order_status AS ENUM (
    'REQUESTED', 'ASSIGNED', 'ACCEPTED', 'RESCHEDULED',
    'EN_ROUTE', 'IN_PROGRESS', 'ISSUE', 'ESCALATED',
    'COMPLETED', 'CANCELLED'
);

CREATE TYPE image_type AS ENUM ('BEFORE', 'AFTER');

CREATE TYPE notification_channel AS ENUM ('EMAIL', 'SMS', 'LINE');

CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED');

-- ----------------------------------------------------------------------------
-- Shared trigger: auto-update `updated_at`
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- users — base identity for HQ / Dealer / Coordinator / Technician.
-- Customers are deliberately NOT in this table (see `customers` below) —
-- they don't need full account infrastructure, just scoped access.
-- ----------------------------------------------------------------------------

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    phone         TEXT,
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_users_role ON users(role);

-- ----------------------------------------------------------------------------
-- dealers
-- ----------------------------------------------------------------------------

CREATE TABLE dealers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    company_name  TEXT NOT NULL,
    contact_info  JSONB NOT NULL DEFAULT '{}', -- variable fields (address, backup phone, etc.)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_dealers_updated_at
    BEFORE UPDATE ON dealers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- coordinators
-- ----------------------------------------------------------------------------

CREATE TABLE coordinators (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    department  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_coordinators_updated_at
    BEFORE UPDATE ON coordinators
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_coordinators_department ON coordinators(department);

-- ----------------------------------------------------------------------------
-- technicians
-- last_lat/last_lng/last_location_at = last-known position synced from
-- Redis, NOT the live feed. Live tracking stays out of Postgres entirely.
-- ----------------------------------------------------------------------------

CREATE TABLE technicians (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    sub_district      TEXT NOT NULL,
    status            technician_status NOT NULL DEFAULT 'OFFLINE',
    last_lat          DOUBLE PRECISION,
    last_lng          DOUBLE PRECISION,
    last_location_at  TIMESTAMPTZ,
    rating_avg        NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count      INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_technicians_updated_at
    BEFORE UPDATE ON technicians
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Coordinator's "select available technician" drawer filters on exactly
-- these two columns together — composite index matches that access pattern.
CREATE INDEX idx_technicians_subdistrict_status ON technicians(sub_district, status);

-- ----------------------------------------------------------------------------
-- customers
-- access_token supports the tokenized magic-link model discussed as one
-- option for customer auth (Open Decision #1) — nullable so this table
-- still works if you land on full customer accounts instead.
-- ----------------------------------------------------------------------------

CREATE TABLE customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    phone         TEXT,
    email         TEXT,
    address       TEXT NOT NULL,
    access_token  TEXT UNIQUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- devices — chargers being serviced. `metadata` is JSONB because charger
-- models genuinely vary in what attributes they carry (voltage spec,
-- connector type, firmware version, etc.) — forcing that into fixed
-- columns or an EAV table would be worse than a narrow JSONB column here.
-- ----------------------------------------------------------------------------

CREATE TABLE devices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id      UUID NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
    model          TEXT NOT NULL,
    serial_number  TEXT UNIQUE NOT NULL,
    ip_address     INET,  -- sensitive: scope carefully, don't expose raw to Technician role by default
    metadata       JSONB NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_devices_dealer ON devices(dealer_id);

-- ----------------------------------------------------------------------------
-- work_orders — core aggregate root.
--
-- sub_district is copied from customer.address at creation time.
-- This is a deliberate denormalization: the Coordinator queue must filter
-- "unassigned orders in district X" before any technician (and therefore
-- any join target for district) exists on the row. Keep it in sync via
-- application code at creation; it should never be edited afterward.
-- ----------------------------------------------------------------------------

CREATE TABLE work_orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id         UUID NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
    customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    technician_id     UUID REFERENCES technicians(id) ON DELETE SET NULL,
    device_id         UUID NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    status            work_order_status NOT NULL DEFAULT 'REQUESTED',
    priority          SMALLINT NOT NULL DEFAULT 0, -- 0=normal, 1=high, 2=urgent
    sla_deadline      TIMESTAMPTZ,
    appointment_date  TIMESTAMPTZ,
    sub_district      TEXT NOT NULL, -- see note above; denormalized by design
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Dealer's "my own work orders" view
CREATE INDEX idx_work_orders_dealer ON work_orders(dealer_id);
-- Technician's "my upcoming work orders" view
CREATE INDEX idx_work_orders_technician ON work_orders(technician_id);
-- Coordinator queue: unassigned/active orders by area
CREATE INDEX idx_work_orders_subdistrict_status ON work_orders(sub_district, status);
-- HQ dashboard: SLA breach scan
CREATE INDEX idx_work_orders_sla_deadline ON work_orders(sla_deadline) WHERE status NOT IN ('COMPLETED', 'CANCELLED');

-- ----------------------------------------------------------------------------
-- work_order_status_history — audit trail. Snapshots from/to status at the
-- time of transition rather than being derived by replaying events —
-- correct by design for an audit log, not a normalization shortcut.
-- ----------------------------------------------------------------------------

CREATE TABLE work_order_status_history (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id      UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    from_status        work_order_status,
    to_status          work_order_status NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note               TEXT,
    changed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wo_history_order_time ON work_order_status_history(work_order_id, changed_at);

-- ----------------------------------------------------------------------------
-- work_order_images — before/after photos. URL only; binary lives in
-- object storage (Supabase Storage / S3), per the architecture doc.
-- ----------------------------------------------------------------------------

CREATE TABLE work_order_images (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id  UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    type           image_type NOT NULL,
    url            TEXT NOT NULL,
    uploaded_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wo_images_order ON work_order_images(work_order_id);

-- ----------------------------------------------------------------------------
-- ratings — one per completed work order.
-- Updating technicians.rating_avg/rating_count here via trigger keeps the
-- aggregate cheap to read (Technician profile, Coordinator drawer) without
-- recomputing AVG() over the full ratings table on every read.
-- ----------------------------------------------------------------------------

CREATE TABLE ratings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id  UUID NOT NULL UNIQUE REFERENCES work_orders(id) ON DELETE CASCADE,
    customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    technician_id  UUID NOT NULL REFERENCES technicians(id) ON DELETE RESTRICT,
    score          SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_technician_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE technicians
    SET rating_count = rating_count + 1,
        rating_avg   = ((rating_avg * rating_count) + NEW.score) / (rating_count + 1)
    WHERE id = NEW.technician_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ratings_update_technician
    AFTER INSERT ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_technician_rating();

-- ----------------------------------------------------------------------------
-- notifications — recipient is either a user OR a customer, never both.
-- `payload` is JSONB because message content genuinely varies by
-- notification type (status_change vs sla_warning vs rating_request).
-- ----------------------------------------------------------------------------

CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
    channel      notification_channel NOT NULL,
    type         TEXT NOT NULL,
    payload      JSONB NOT NULL DEFAULT '{}',
    status       notification_status NOT NULL DEFAULT 'PENDING',
    sent_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_notifications_one_recipient CHECK (
        (user_id IS NOT NULL AND customer_id IS NULL) OR
        (user_id IS NULL AND customer_id IS NOT NULL)
    )
);

-- BullMQ worker picks up pending jobs — this is the query it runs.
CREATE INDEX idx_notifications_status ON notifications(status) WHERE status = 'PENDING';
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_customer ON notifications(customer_id);

-- ============================================================================
-- Reporting layer — NOT part of the normalized transactional schema above.
-- Refresh on a schedule (e.g. every 60s via BullMQ repeatable job) or on
-- write via trigger, once dashboard query latency actually becomes a
-- problem. Don't wire this up before you feel the pain.
-- ============================================================================

CREATE MATERIALIZED VIEW hq_kpi_summary AS
SELECT
    sub_district,
    status,
    COUNT(*) AS order_count,
    COUNT(*) FILTER (WHERE sla_deadline < now() AND status NOT IN ('COMPLETED', 'CANCELLED')) AS sla_breached_count
FROM work_orders
GROUP BY sub_district, status;

CREATE UNIQUE INDEX idx_hq_kpi_summary_key ON hq_kpi_summary(sub_district, status);

-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY hq_kpi_summary;