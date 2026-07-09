-- ============================================================================
-- Row-Level Security (RLS) policies
--
-- These policies use session parameters set by the RlsInterceptor +
-- PrismaService proxy (see common/interceptors/rls.interceptor.ts and
-- common/prisma.service.ts). Every query from the application writes
-- app.user_id, app.user_role, app.profile_id, app.customer_id, and
-- app.department into the session before reaching Prisma.
--
-- The runtime DB user (not the migration superuser) must be the table
-- owner or have RLS applied to it — see .env.example for the
-- DATABASE_URL_RUNTIME pattern.
-- ============================================================================

-- --------------------------------------------------------------------------
-- work_orders
-- --------------------------------------------------------------------------
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_orders_select ON work_orders FOR SELECT
  USING (
    CASE current_setting('app.user_role', true)
      WHEN 'HQ'             THEN true
      WHEN 'DEALER'         THEN dealer_id = current_setting('app.profile_id', true)::uuid
      WHEN 'COORDINATOR'    THEN department = current_setting('app.department', true)
      WHEN 'TECHNICIAN'     THEN technician_id = current_setting('app.profile_id', true)::uuid
      WHEN 'CUSTOMER'       THEN customer_id = current_setting('app.customer_id', true)::uuid
      ELSE false
    END
  );

CREATE POLICY work_orders_insert ON work_orders FOR INSERT
  WITH CHECK (
    CASE current_setting('app.user_role', true)
      WHEN 'DEALER' THEN dealer_id = current_setting('app.profile_id', true)::uuid
      ELSE false
    END
  );

CREATE POLICY work_orders_update ON work_orders FOR UPDATE
  USING (
    CASE current_setting('app.user_role', true)
      WHEN 'HQ'             THEN true
      WHEN 'COORDINATOR'    THEN department = current_setting('app.department', true)
      WHEN 'TECHNICIAN'     THEN technician_id = current_setting('app.profile_id', true)::uuid
      WHEN 'DEALER'         THEN dealer_id = current_setting('app.profile_id', true)::uuid
      ELSE false
    END
  );

CREATE POLICY work_orders_delete ON work_orders FOR DELETE
  USING (
    current_setting('app.user_role', true) = 'HQ'
  );

-- --------------------------------------------------------------------------
-- customers
-- --------------------------------------------------------------------------
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select ON customers FOR SELECT
  USING (
    CASE current_setting('app.user_role', true)
      WHEN 'HQ'   THEN true
      WHEN 'DEALER' THEN
        EXISTS (
          SELECT 1 FROM work_orders
          WHERE work_orders.customer_id = customers.id
            AND work_orders.dealer_id = current_setting('app.profile_id', true)::uuid
        )
      ELSE false
    END
  );

CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (
    current_setting('app.user_role', true) IN ('HQ', 'DEALER')
  );

CREATE POLICY customers_update ON customers FOR UPDATE
  USING (
    CASE current_setting('app.user_role', true)
      WHEN 'HQ'   THEN true
      WHEN 'DEALER' THEN
        EXISTS (
          SELECT 1 FROM work_orders
          WHERE work_orders.customer_id = customers.id
            AND work_orders.dealer_id = current_setting('app.profile_id', true)::uuid
        )
      ELSE false
    END
  );

CREATE POLICY customers_delete ON customers FOR DELETE
  USING (
    current_setting('app.user_role', true) = 'HQ'
  );

-- --------------------------------------------------------------------------
-- devices
-- --------------------------------------------------------------------------
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY devices_select ON devices FOR SELECT
  USING (
    CASE current_setting('app.user_role', true)
      WHEN 'HQ'     THEN true
      WHEN 'DEALER' THEN dealer_id = current_setting('app.profile_id', true)::uuid
      ELSE false
    END
  );

CREATE POLICY devices_insert ON devices FOR INSERT
  WITH CHECK (
    current_setting('app.user_role', true) IN ('HQ', 'DEALER')
      AND dealer_id = current_setting('app.profile_id', true)::uuid
  );

CREATE POLICY devices_update ON devices FOR UPDATE
  USING (
    CASE current_setting('app.user_role', true)
      WHEN 'HQ'     THEN true
      WHEN 'DEALER' THEN dealer_id = current_setting('app.profile_id', true)::uuid
      ELSE false
    END
  );

CREATE POLICY devices_delete ON devices FOR DELETE
  USING (
    current_setting('app.user_role', true) = 'HQ'
  );

-- --------------------------------------------------------------------------
-- work_order_images
-- --------------------------------------------------------------------------
ALTER TABLE work_order_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_order_images_select ON work_order_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = work_order_images.work_order_id
        AND (
          CASE current_setting('app.user_role', true)
            WHEN 'HQ'             THEN true
            WHEN 'DEALER'         THEN work_orders.dealer_id = current_setting('app.profile_id', true)::uuid
            WHEN 'COORDINATOR'    THEN work_orders.department = current_setting('app.department', true)
            WHEN 'TECHNICIAN'     THEN work_orders.technician_id = current_setting('app.profile_id', true)::uuid
            WHEN 'CUSTOMER'       THEN work_orders.customer_id = current_setting('app.customer_id', true)::uuid
            ELSE false
          END
        )
    )
  );

CREATE POLICY work_order_images_insert ON work_order_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = work_order_images.work_order_id
        AND (
          CASE current_setting('app.user_role', true)
            WHEN 'TECHNICIAN' THEN work_orders.technician_id = current_setting('app.profile_id', true)::uuid
            ELSE false
          END
        )
    )
  );

CREATE POLICY work_order_images_delete ON work_order_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = work_order_images.work_order_id
        AND (
          CASE current_setting('app.user_role', true)
            WHEN 'HQ' THEN true
            ELSE false
          END
        )
    )
  );

-- --------------------------------------------------------------------------
-- notifications
-- --------------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (
    CASE current_setting('app.user_role', true)
      WHEN 'HQ' THEN true
      WHEN 'CUSTOMER' THEN customer_id = current_setting('app.customer_id', true)::uuid
      ELSE user_id = current_setting('app.user_id', true)::uuid
    END
  );

CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (
    CASE current_setting('app.user_role', true)
      WHEN 'CUSTOMER' THEN customer_id = current_setting('app.customer_id', true)::uuid
      ELSE user_id = current_setting('app.user_id', true)::uuid
    END
  );

-- --------------------------------------------------------------------------
-- ratings
-- --------------------------------------------------------------------------
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ratings_select ON ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = ratings.work_order_id
        AND (
          CASE current_setting('app.user_role', true)
            WHEN 'HQ'             THEN true
            WHEN 'DEALER'         THEN work_orders.dealer_id = current_setting('app.profile_id', true)::uuid
            WHEN 'COORDINATOR'    THEN work_orders.department = current_setting('app.department', true)
            WHEN 'TECHNICIAN'     THEN work_orders.technician_id = current_setting('app.profile_id', true)::uuid
            WHEN 'CUSTOMER'       THEN work_orders.customer_id = current_setting('app.customer_id', true)::uuid
            ELSE false
          END
        )
    )
  );

CREATE POLICY ratings_insert ON ratings FOR INSERT
  WITH CHECK (
    current_setting('app.user_role', true) = 'CUSTOMER'
  );

-- --------------------------------------------------------------------------
-- technicians — coordinators see department, HQ sees all, tech sees self
-- --------------------------------------------------------------------------
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY technicians_select ON technicians FOR SELECT
  USING (
    CASE current_setting('app.user_role', true)
      WHEN 'HQ' THEN true
      WHEN 'COORDINATOR' THEN
        EXISTS (
          SELECT 1 FROM coordinators
          WHERE coordinators.user_id = current_setting('app.user_id', true)::uuid
            AND coordinators.department = technicians.sub_district
        )
      ELSE id = current_setting('app.profile_id', true)::uuid
    END
  );

CREATE POLICY technicians_update ON technicians FOR UPDATE
  USING (
    id = current_setting('app.profile_id', true)::uuid
  );
