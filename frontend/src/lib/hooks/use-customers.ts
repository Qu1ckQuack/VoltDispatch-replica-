'use client'

import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/lib/api'

const CUSTOMERS_KEY = 'customers'

export function useCustomers() {
  return useQuery({
    queryKey: [CUSTOMERS_KEY],
    queryFn: () => customersApi.list(),
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, id],
    queryFn: () => customersApi.get(id),
    enabled: !!id,
  })
}
