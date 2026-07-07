# Technicians Page — Implementation Plan

## Backend
- `GET /technicians` — returns array with `user` + `_count.workOrders`; HQ only
- `POST /technicians` — `{ userId, subDistrict }`; HQ only
- `GET /technicians/:id` — returns technician with `user`; HQ only
- `PATCH /technicians/:id` — `{ subDistrict? }`; HQ only
- `DELETE /technicians/:id` — soft-deletes linked user; HQ only
- `PATCH /technicians/me/status` — `{ status }`; TECHNICIAN only

## Files to create/modify

### 1. Add mutations to `src/lib/hooks/use-technicians.ts`
```ts
export function useCreateTechnician() { mutationFn: techniciansApi.create }
export function useUpdateTechnician() { mutationFn: ({id, data}) => techniciansApi.update(id, data) }
export function useDeleteTechnician() { mutationFn: (id) => techniciansApi.remove(id) }
export function useUpdateTechnicianStatus() { mutationFn: (data) => techniciansApi.updateStatus(data) }
```

### 2. `src/components/technicians/technician-table.tsx`
Table columns: Email (from user), Sub-district, Status (colored badge), Rating, Work Orders count, Actions
- Filter by sub-district (text input) and status (dropdown)
- Status badge: AVAILABLE (green), BUSY (yellow/sand), OFFLINE (muted)
- Sorted by status (online first), then rating

### 3. `src/components/technicians/technician-form-modal.tsx`
Create technician:
- User selector: show list of users without a technician profile (GET /users filtered by role=TECHNICIAN)
  - OR: just an email input that creates a User + Technician in one step
  - Simpler approach: just `userId` + `subDistrict` fields
- Sub-district text input
Edit technician: subDistrict only

### 4. `src/components/technicians/status-toggle.tsx`
For TECHNICIAN role on their own profile: dropdown/buttons to set AVAILABLE/BUSY/OFFLINE
Calls `PATCH /technicians/me/status`

### 5. Rewrite `src/app/(dashboard)/technicians/page.tsx`
'use client' — orchestrates:
- Filter bar (sub-district, status)
- Technician table
- Create/Edit/Delete modals
- Status toggle (shown for TECHNICIAN user's own row)
- Role-aware: only HQ sees CRUD; TECHNICIAN sees own status toggle
