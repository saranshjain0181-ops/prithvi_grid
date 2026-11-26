import apiClient from './client';
import type { ApiResponse } from '@/types';

export interface ThresholdValues {
  tempMin: number;
  tempMax: number;
  moistureMin: number;
  moistureMax: number;
  phAcidCrash: number;
  methaneAlert: number;
  methaneCritical: number;
  pressureCompactionAlert: number;
  verificationWaitMinutes: number;
  nodeOfflineMinutes: number;
}

export interface SimulationResult {
  evaluatedSampleCount: number;
  baselineAlerts: number;
  simulatedAlerts: number;
  alertDeltaPct: number;
  compliancePassRateBaselinePct: number;
  compliancePassRateSimulatedPct: number;
  affectedPitsCount: number;
}

export interface ThresholdHistoryItem {
  _id: string;
  version: number;
  thresholds: ThresholdValues;
  simulationSummary?: SimulationResult;
  status: 'DRAFT' | 'SIMULATED' | 'ACTIVE' | 'ARCHIVED';
  notes: string;
  deployedAt?: string;
  createdAt: string;
}

export const configApi = {
  getThresholds: async (): Promise<{
    success: boolean;
    data: {
      activeThresholds: ThresholdValues;
      history: ThresholdHistoryItem[];
    };
  }> => {
    const { data } = await apiClient.get('/hq/thresholds');
    return data;
  },

  backtestThresholds: async (
    proposed: Partial<ThresholdValues>
  ): Promise<{
    success: boolean;
    data: {
      proposed: ThresholdValues;
      simulation: SimulationResult;
    };
  }> => {
    const { data } = await apiClient.post('/hq/thresholds/backtest', proposed);
    return data;
  },

  deployThresholds: async (payload: {
    thresholds: Partial<ThresholdValues>;
    simulation?: SimulationResult;
    notes?: string;
  }): Promise<{ success: boolean; message: string; data: ThresholdHistoryItem }> => {
    const { data } = await apiClient.post('/hq/thresholds/deploy', payload);
    return data;
  },

  sendOtp: async (phone: string): Promise<ApiResponse<{ expiresIn: number }>> => {
    const { data } = await apiClient.post('/hq/onboarding/send-otp', { phone });
    return data;
  },

  verifyOtp: async (phone: string, otp: string): Promise<ApiResponse<{ verified: boolean; qrCodes: string[] }>> => {
    const { data } = await apiClient.post('/hq/onboarding/verify-otp', { phone, otp });
    return data;
  },

  completeOnboarding: async (payload: unknown): Promise<ApiResponse<{ entityId: string; facilityId: string }>> => {
    const { data } = await apiClient.post('/hq/onboarding/complete', payload);
    return data;
  },
};
