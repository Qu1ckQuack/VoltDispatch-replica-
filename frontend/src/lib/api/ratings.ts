import { api } from './client'
import type { Rating, CreateRatingDto } from './types'

export const ratingsApi = {
  create: (workOrderId: string, data: CreateRatingDto) =>
    api.post<Rating>(`/work-orders/${workOrderId}/ratings`, data).then((r) => r.data),

  get: (workOrderId: string) =>
    api.get<Rating>(`/work-orders/${workOrderId}/ratings`).then((r) => r.data),

  remove: (workOrderId: string, ratingId: string) =>
    api.delete<void>(`/work-orders/${workOrderId}/ratings/${ratingId}`).then((r) => r.data),
}
