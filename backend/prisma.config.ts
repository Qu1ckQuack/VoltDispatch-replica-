// Prisma 7 configuration file — required alongside schema.prisma.
// As of Prisma 7, the database connection, migration path, and seed
// script no longer live inside schema.prisma itself; they're configured
// here instead. Place this file at the project root (next to package.json).

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Falls back to process.env directly if you ever run `prisma generate`
    // in a build context with no .env loaded (e.g. some Docker build
    // stages) — env() alone would throw in that case.
    url: env("DATABASE_URL"),
  },
});