import { api } from './client'
import type { WorkOrderImage, UploadImageDto } from './types'

export const mediaApi = {
  upload: (workOrderId: string, data: UploadImageDto, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', data.type)
    return api
      .post<WorkOrderImage>(`/work-orders/${workOrderId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  list: (workOrderId: string) =>
    api.get<WorkOrderImage[]>(`/work-orders/${workOrderId}/images`).then((r) => r.data),

  remove: (workOrderId: string, imageId: string) =>
    api.delete<void>(`/work-orders/${workOrderId}/images/${imageId}`).then((r) => r.data),
}
