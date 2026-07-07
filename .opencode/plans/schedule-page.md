# Schedule Page — Implementation Plan

## Backend
No dedicated schedule endpoint. Data sourced from:
- `GET /work-orders` — query by `appointmentDate` range or with non-null appointmentDate

## Approach
Build a simple **timeline list** grouped by date — no calendar grid library needed.

- Fetch all work orders with `page=1&limit=100`
- Client-side filter: only orders with `appointmentDate` set
- Group by date
- Display as date headers with expandable order cards below

## Files to create

### 1. `src/components/schedule/date-group.tsx`
Collapsible section per date:
- Date header (e.g. "Mon, Jul 7 — 3 orders")
- List of work order cards inside
- Badge showing count per status for that day

### 2. `src/components/schedule/order-card.tsx`
Compact card per work order:
- ID (short), Status badge, Customer name, Sub-district, Technician (assigned or —)
- Priority indicator (color dot)
- Click → opens order detail modal (reuse from work-orders)

### 3. `src/components/schedule/date-navigation.tsx`
Quick nav:
- "Today" button
- Previous / Next day arrows
- Or a simple date input to jump to a specific date

### 4. Rewrite `src/app/(dashboard)/schedule/page.tsx`
'use client' — orchestrates:
- Date navigation (default: today)
- Fetches work orders, filters by appointmentDate range
- Groups by date
- Renders date groups with expandable order cards
- Click order card → opens OrderDetailModal (reuse from work-orders)
