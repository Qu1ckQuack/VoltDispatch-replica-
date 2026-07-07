import { api } from './client'
import type { Customer, CreateCustomerDto, UpdateCustomerDto } from './types'

export const customersApi = {
  create: (data: CreateCustomerDto) =>
    api.post<Customer>('/customers', data).then((r) => r.data),

  list: () =>
    api.get<Customer[]>('/customers').then((r) => r.data),

  get: (id: string) =>
    api.get<Customer>(`/customers/${id}`).then((r) => r.data),

  update: (id: string, data: UpdateCustomerDto) =>
    api.patch<Customer>(`/customers/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete<void>(`/customers/${id}`).then((r) => r.data),
}
