-- Add completed_at column for HQ reporting queries
ALTER TABLE "work_orders" ADD COLUMN "completed_at" TIMESTAMP(3);

-- Index for reporting summary period filter
CREATE INDEX IF NOT EXISTS idx_work_orders_completed_at ON "work_orders" ("completed_at");

-- Index for recently completed / pending order panels
CREATE INDEX IF NOT EXISTS idx_work_orders_status_updated_at ON "work_orders" ("status", "updated_at");

-- Index for pending last 7 days / daily by status
CREATE INDEX IF NOT EXISTS idx_work_orders_status_created_at ON "work_orders" ("status", "created_at");

-- Index for technician workload (non-terminal)
CREATE INDEX IF NOT EXISTS idx_work_orders_status_technician_id ON "work_orders" ("status", "technician_id");
