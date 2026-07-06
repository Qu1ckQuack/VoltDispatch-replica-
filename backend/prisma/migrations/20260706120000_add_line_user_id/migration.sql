-- Add line_user_id to users and customers for LINE notification delivery
ALTER TABLE "users" ADD COLUMN "line_user_id" TEXT;
ALTER TABLE "customers" ADD COLUMN "line_user_id" TEXT;
