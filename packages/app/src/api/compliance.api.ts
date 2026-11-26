import apiClient from './client';
import type { ApiResponse } from '@/types';

export interface GenerateAuditPayload {
  facilityId: string;
  periodStart?: string;
  periodEnd?: string;
  reportingPeriod?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  fineSlabInr?: number;
  compostPricePerKg?: number;
  tippingFeePerMt?: number;
}

export interface ComplianceCertificateRecord {
  _id: string;
  certificateId: string;
  certificateHash: string;
  previousCertificateHash: string;
  facilityId: { _id: string; name: string; facilityName: string; imcZone?: string };
  entityId: { _id: string; orgName: string; swmRegNo?: string };
  periodStart: string;
  periodEnd: string;
  reportingPeriod: string;
  status: string;
  summary: {
    totalWasteInKg: number;
    totalFertilizerOutKg: number;
    avgTempC: number;
    thermophilicHours: number;
    avgMoisturePct: number;
    maxMethanePpm: number;
    labourVerifiedGenuine: number;
    violationsPrevented: number;
  };
  financialEstimates: {
    fineSlabInr: number;
    finesPreventedInr: number;
    compostPricePerKg: number;
    compostValueInr: number;
    tippingFeePerMt: number;
    landfillHaulingSavingsInr: number;
    totalEstimatedSavingsInr: number;
    carbonOffsetKg: number;
    isEstimated: boolean;
    legalDisclaimer: string;
  };
  requirementsCatalog: Array<{
    code: string;
    title: string;
    clause: string;
    status: 'COMPLIANT' | 'NON_COMPLIANT' | 'INCONCLUSIVE' | 'EXEMPT';
    evidenceSummary: string;
  }>;
  createdAt: string;
}

export const complianceApi = {
  getArchive: async (params?: {
    facilityId?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ComplianceCertificateRecord[]> & { total: number; totalPages: number }> => {
    const { data } = await apiClient.get('/compliance/archive', { params });
    return data;
  },

  generateAudit: async (payload: GenerateAuditPayload): Promise<ApiResponse<ComplianceCertificateRecord>> => {
    const { data } = await apiClient.post('/compliance/generate', payload);
    return data;
  },

  verifyHash: async (hashOrId: string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get(`/compliance/verify/${hashOrId}`);
    return data;
  },

  generateAuditorToken: async (payload: {
    facilityId: string;
    expiresInHours?: number;
    auditorName?: string;
    auditorAgency?: string;
  }): Promise<ApiResponse<{ token: string; shareableUrl: string; expiresAt: string }>> => {
    const { data } = await apiClient.post('/compliance/auditor-token', payload);
    return data;
  },

  getAuditorInspectBundle: async (token?: string): Promise<ApiResponse<any>> => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const { data } = await apiClient.get('/compliance/auditor-inspect', { headers });
    return data;
  },
};
