import apiClient from './client';
import type { Entity, ApiResponse, PaginatedResponse } from '@/types';

export const entitiesApi = {
  list: async (page = 1, limit = 50): Promise<PaginatedResponse<Entity>> => {
    const { data } = await apiClient.get('/hq/entities', { params: { page, limit } });
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<Entity>> => {
    const { data } = await apiClient.get(`/hq/entities/${id}`);
    return data;
  },

  create: async (payload: Omit<Entity, 'id' | 'createdAt'>): Promise<ApiResponse<Entity>> => {
    const { data } = await apiClient.post('/hq/entities', payload);
    return data;
  },

  update: async (id: string, payload: Partial<Entity>): Promise<ApiResponse<Entity>> => {
    const { data } = await apiClient.patch(`/hq/entities/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete(`/hq/entities/${id}`);
    return data;
  },

  exportCsv: async (): Promise<Blob> => {
    const { data } = await apiClient.get('/hq/entities/export', { responseType: 'blob' });
    return data;
  },
};
