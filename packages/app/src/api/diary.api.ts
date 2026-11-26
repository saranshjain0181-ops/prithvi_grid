import apiClient from './client'
import type { ApiResponse, DiaryEntry, DiaryEntryType, PaginatedResponse } from '@/types'

export interface CreateDiaryEntryPayload {
  boxId: string
  nodeId?: string
  flowType?: 'WASTE_IN' | 'FERTILIZER_OUT'
  entryType?: DiaryEntryType
  weightKg?: number
  quantityKg?: number
  recordedAt?: string
  entryDate?: string
  notes?: string
}

export const diaryApi = {
  createEntry: async (payload: CreateDiaryEntryPayload): Promise<ApiResponse<DiaryEntry>> => {
    const { data } = await apiClient.post<ApiResponse<DiaryEntry>>('/pit-monitor/entry', payload)
    return data
  },

  getMyEntries: async (params?: {
    page?: number
    limit?: number
    boxId?: string
    entryType?: DiaryEntryType
    fromDate?: string
    toDate?: string
  }): Promise<PaginatedResponse<DiaryEntry>> => {
    const { data } = await apiClient.get<PaginatedResponse<DiaryEntry>>('/diary/entries/mine', {
      params,
    })
    return data
  },

  getAllEntries: async (params?: {
    page?: number
    limit?: number
    boxId?: string
    userId?: string
    entryType?: DiaryEntryType
    fromDate?: string
    toDate?: string
  }): Promise<PaginatedResponse<DiaryEntry>> => {
    const { data } = await apiClient.get<PaginatedResponse<DiaryEntry>>('/diary/entries', {
      params,
    })
    return data
  },

  undoEntry: async (id: string): Promise<ApiResponse<{ deletedEntryId: string; boxId: string; currentFillKg: number }>> => {
    const { data } = await apiClient.delete<ApiResponse<{ deletedEntryId: string; boxId: string; currentFillKg: number }>>(`/pit-monitor/entry/${id}`)
    return data
  },

  getBoxMonitor: async (boxId: string): Promise<ApiResponse<{ boxId: string; boxName: string; capacityKg: number; currentFillKg: number; fillPercentage: number; recentEntries: any[] }>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/pit-monitor/box/${boxId}`)
    return data
  },
}
