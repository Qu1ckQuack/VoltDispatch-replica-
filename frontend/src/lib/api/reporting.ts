import { api } from './client'
import type {
  ReportingOverview,
  ReportingSummary,
  SearchResult,
  SummaryQueryDto,
  SearchQueryDto,
} from './types'

export const reportingApi = {
  overview: () =>
    api.get<ReportingOverview>('/reporting/overview').then((r) => r.data),

  summary: (query?: SummaryQueryDto) =>
    api.get<ReportingSummary>('/reporting/summary', { params: query }).then((r) => r.data),

  search: (query: SearchQueryDto) =>
    api.get<SearchResult[]>('/reporting/search', { params: query }).then((r) => r.data),
}
