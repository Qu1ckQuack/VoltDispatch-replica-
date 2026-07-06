# Pending Tasks

_Auto-synced every 30s — last write: 2026-07-06T07:56:00.786Z_

## Session `ses_0c9aa1da0ffeSU6RlT6WM3gWDs`

- [x] Fix BullmqModule.onModuleDestroy — close injected queues instead of creating new ones
- [x] Fix LINE notification — send actual LINE userId, not email
- [x] Fix SLA warnings — enqueue via NotificationsService, not raw queue + synthetic IDs
- [x] Extract buildConnectionOptions into shared helper (DRY)
- [x] Stop SlaService from creating its own Worker — add proper cleanup
- [x] Fix DEALER scoping fallback in ScopingService
- [x] Fix WorkOrdersService.findById — apply scope in WHERE clause, not post-fetch
- [x] Fix RESCHEDULED to use transition() for concurrency check
- [x] Add Customer.lineUserId to schema + LINE recipient resolution
- [x] Add missing notifications for ACCEPTED, IN_PROGRESS, RESCHEDULED states
- [x] Verify compilation succeeds
