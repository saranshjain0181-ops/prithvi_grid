import apiClient from './client'
import type { ApiResponse, TelemetryPoint, TelemetryReading } from '@/types'

export const telemetryApi = {
  getLiveReading: async (boxId: string, nodeId: string): Promise<ApiResponse<TelemetryReading>> => {
    const { data } = await apiClient.get<ApiResponse<TelemetryReading>>(
      `/telemetry/live/${boxId}/${nodeId}`
    )
    return data
  },

  getHistory: async (
    boxId: string,
    nodeId: string,
    days = 30
  ): Promise<ApiResponse<TelemetryPoint[]>> => {
    const { data } = await apiClient.get<ApiResponse<TelemetryPoint[]>>(
      `/telemetry/history/${boxId}/${nodeId}`,
      { params: { days } }
    )
    return data
  },

  getAllBoxesLatest: async (): Promise<ApiResponse<TelemetryReading[]>> => {
    const { data } = await apiClient.get<ApiResponse<TelemetryReading[]>>('/telemetry/latest')
    return data
  },
}
