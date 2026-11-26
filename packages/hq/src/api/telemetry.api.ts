import apiClient from './client';
import type { KpiData, Facility, ApiResponse, PaginatedResponse } from '@/types';

export const telemetryApi = {
  getKpis: async (): Promise<ApiResponse<KpiData>> => {
    const { data } = await apiClient.get('/hq/telemetry/kpis');
    return data;
  },

  getFacilities: async (): Promise<PaginatedResponse<Facility>> => {
    const { data } = await apiClient.get('/hq/facilities', { params: { limit: 500 } });
    return data;
  },

  getFacilityById: async (id: string): Promise<ApiResponse<Facility>> => {
    const { data } = await apiClient.get(`/hq/facilities/${id}`);
    return data;
  },

  getTelemetryRows: async (page = 1, limit = 50) => {
    const { data } = await apiClient.get('/hq/telemetry', { params: { page, limit } });
    return data;
  },

  getAlerts: async (page = 1, limit = 50) => {
    const { data } = await apiClient.get('/hq/alerts', { params: { page, limit } });
    return data;
  },
};
