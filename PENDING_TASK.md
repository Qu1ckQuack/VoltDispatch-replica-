# Pending Tasks

_Auto-synced every 30s — last write: 2026-07-08T06:33:59.119Z_

## Session `ses_0c001168bffe7gWc84wTi2Ks4i`

- [x] Create app_nest Postgres role + enable RLS on all tables (SQL migration)
- [x] Write RLS policies for all 12 tables
- [x] Add DATABASE_URL_RUNTIME to .env + update prisma.service.ts to use it
- [x] Create RlsContext interceptor + AsyncLocalStorage for per-request user context
- [x] Add Prisma proxy to auto-wrap queries with SET LOCAL per request context
- [x] Fix notifications controller to inject @CurrentUser() and pass user context
- [x] Register RlsInterceptor globally in app.module.ts
- [x] Verify the backend compiles and tests pass
