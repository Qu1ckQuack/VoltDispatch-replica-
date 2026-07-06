-- Custom constraints and partial indexes that Prisma's schema language
-- cannot express natively. See schema.prisma design notes for details.

-- Partial index on sla_deadline â€” only open orders, so the HQ SLA breach
-- scan skips completed/cancelled orders entirely.
CREATE INDEX IF NOT EXISTS "work_orders_sla_deadline_partial_idx"
  ON "work_orders"("sla_deadline")
  WHERE "status" NOT IN ('COMPLETED', 'CANCELLED');

-- CHECK constraint on ratings.score â€” enforce 1-5 at the DB level in
-- addition to DTO-level validation.
ALTER TABLE "ratings"
  ADD CONSTRAINT "ratings_score_check"
  CHECK ("score" >= 1 AND "score" <= 5);

-- XOR recipient constraint on notifications â€” exactly one of
-- user_id or customer_id must be set, never both and never neither.
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_recipient_check"
  CHECK (
    ("user_id" IS NOT NULL AND "customer_id" IS NULL) OR
    ("user_id" IS NULL AND "customer_id" IS NOT NULL)
  );
