import apiClient from './client';
import type { ComplianceRecord, ApiResponse, PaginatedResponse } from '@/types';

export const complianceApi = {
  list: async (page = 1, limit = 50): Promise<PaginatedResponse<ComplianceRecord>> => {
    const { data } = await apiClient.get('/hq/compliance', { params: { page, limit } });
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<ComplianceRecord>> => {
    const { data } = await apiClient.get(`/hq/compliance/${id}`);
    return data;
  },

  resolve: async (id: string, notes: string): Promise<ApiResponse<ComplianceRecord>> => {
    const { data } = await apiClient.patch(`/hq/compliance/${id}/resolve`, { notes });
    return data;
  },

  exportCsv: async (year: number, month: number): Promise<Blob> => {
    const { data } = await apiClient.get('/hq/compliance/export', {
      params: { year, month },
      responseType: 'blob',
    });
    return data;
  },
};
