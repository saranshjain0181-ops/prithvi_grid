import apiClient from './client'
import type { Alert, ApiResponse, PaginatedResponse } from '@/types'

export const alertsApi = {
  getAll: async (params?: {
    page?: number
    limit?: number
    boxId?: string
    severity?: string
    isAcknowledged?: boolean
  }): Promise<PaginatedResponse<Alert>> => {
    const { data } = await apiClient.get<PaginatedResponse<Alert>>('/alerts', { params })
    return data
  },

  getActive: async (): Promise<ApiResponse<Alert[]>> => {
    const { data } = await apiClient.get<ApiResponse<Alert[]>>('/alerts/active')
    return data
  },

  acknowledge: async (alertId: string): Promise<ApiResponse<Alert>> => {
    const { data } = await apiClient.patch<ApiResponse<Alert>>(`/alerts/${alertId}/acknowledge`)
    return data
  },

  resetAlarm: async (boxId: string): Promise<ApiResponse<{ success: boolean }>> => {
    const { data } = await apiClient.post<ApiResponse<{ success: boolean }>>(
      `/alerts/alarm/reset/${boxId}`
    )
    return data
  },
}
