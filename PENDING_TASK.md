# Pending Tasks

_Auto-synced every 30s — last write: 2026-07-09T07:18:29.818Z_

## Session `ses_0ba9dc801ffe8jUVYyeVITR2iv`

- [x] Phase 1.1: Create AppExceptionFilter (global, catches HttpException + validation errors, logs with request context)
- [x] Phase 1.2: Define ErrorCodes enum + AppException classes
- [x] Phase 1.3: Prisma error integration (mapped codes P2002→409, P2025→404, etc.)
- [x] Phase 1.4: WS exception filter (normalizes WS errors, sends structured payloads)
- [x] Phase 5.2: Request-ID middleware (UUID per request, X-Request-Id header, structured logging)
- [x] Register AppExceptionFilter as APP_FILTER in CommonModule
- [x] Phase 1.5: Migrate existing throw sites from NestJS exceptions to AppException
- [x] Run tests to verify all error handling paths
