'use client'

import { useQuery } from '@tanstack/react-query'
import { reportingApi } from '@/lib/api'
import type { SummaryQueryDto } from '@/lib/api/types'

const REPORTING_KEY = 'reporting'

export function useReportingOverview() {
  return useQuery({
    queryKey: [REPORTING_KEY, 'overview'],
    queryFn: () => reportingApi.overview(),
  })
}

export function useReportingSummary(query?: SummaryQueryDto) {
  return useQuery({
    queryKey: [REPORTING_KEY, 'summary', query],
    queryFn: () => reportingApi.summary(query),
  })
}
