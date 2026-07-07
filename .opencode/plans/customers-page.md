# Customers Page — Implementation Plan

## Backend
- `GET /customers` — returns array with `_count.workOrders`; DEALER scoped to related customers
- `POST /customers` — `{ name, phone?, email?, address, subDistrict }`
- `GET /customers/:id` — returns customer with `workOrders[]`
- `PATCH /customers/:id` — partial update
- `DELETE /customers/:id` — returns `{ deleted: true }`
- Roles: HQ, DEALER

## Files to create/modify

### 1. Add mutations to `src/lib/hooks/use-customers.ts`
```ts
export function useCreateCustomer() { mutationFn: customersApi.create }
export function useUpdateCustomer() { mutationFn: ({id, data}) => customersApi.update(id, data) }
export function useDeleteCustomer() { mutationFn: (id) => customersApi.remove(id) }
```

### 2. `src/components/customers/customer-table.tsx`
Table columns: Name, Phone, Email, Sub-district, Work Orders count, Actions (View/Edit/Delete)
- Sortable by name, createdAt
- Click name to view detail modal

### 3. `src/components/customers/customer-form-modal.tsx`
Reusable for create + edit:
- Fields: name, phone, email, address, subDistrict
- Create: all required except phone/email
- Edit: all optional (pre-filled)
- On submit calls create or update mutation

### 4. `src/components/customers/customer-detail-modal.tsx`
Shows all customer fields + list of their work orders (from `customer.workOrders[]`)
- Work orders listed as: ID, status, device model, created date

### 5. `src/components/customers/delete-confirm-modal.tsx`
Confirmation with customer name — calls delete mutation

### 6. Rewrite `src/app/(dashboard)/customers/page.tsx`
'use client' — orchestrates:
- Search input (filters by name/phone/subDistrict client-side)
- Customer table
- Create/Edit/Detail/Delete modals
- Role-aware: DEALER sees only their customers (backend handles scoping)
