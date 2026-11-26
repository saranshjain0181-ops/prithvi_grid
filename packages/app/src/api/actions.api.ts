import apiClient from './client'
import type { ActionRecord, ActionType, ApiResponse, PaginatedResponse, VerificationStatus } from '@/types'

export interface TriggerActionPayload {
  actionType: ActionType
  boxId: string
  nodeId: string
  photoBase64?: string
  notes?: string
}

export interface UpdateVerificationPayload {
  status: VerificationStatus
  remark?: string
}

export const actionsApi = {
  trigger: async (payload: TriggerActionPayload): Promise<ApiResponse<ActionRecord>> => {
    const { data } = await apiClient.post<ApiResponse<ActionRecord>>('/verification/trigger', payload)
    return data
  },

  getMyActions: async (params?: {
    page?: number
    limit?: number
    boxId?: string
    status?: VerificationStatus
  }): Promise<PaginatedResponse<ActionRecord>> => {
    const { data } = await apiClient.get<PaginatedResponse<ActionRecord>>('/verification/history', {
      params,
    })
    return data
  },

  getAllActions: async (params?: {
    page?: number
    limit?: number
    boxId?: string
    userId?: string
    status?: VerificationStatus
    fromDate?: string
    toDate?: string
  }): Promise<PaginatedResponse<ActionRecord>> => {
    const { data } = await apiClient.get<PaginatedResponse<ActionRecord>>('/verification/history', {
      params,
    })
    return data
  },

  updateVerification: async (
    actionId: string,
    payload: UpdateVerificationPayload
  ): Promise<ApiResponse<ActionRecord>> => {
    const { data } = await apiClient.patch<ApiResponse<ActionRecord>>(
      `/actions/${actionId}/verify`,
      payload
    )
    return data
  },

  overrideLedger: async (payload: {
    ledgerId: string
    status: string
    managerRemark?: string
  }): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/verification/override', payload)
    return data
  },
}
