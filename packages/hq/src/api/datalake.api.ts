import apiClient from './client';

export type CollectionKey =
  | 'ENTITIES'
  | 'FACILITIES'
  | 'ROSTER'
  | 'ASSETS'
  | 'TELEMETRY'
  | 'LEDGER'
  | 'DIARY'
  | 'SANJIVANI'
  | 'COMPLIANCE'
  | 'BATCHES';

export interface DataLakeResponse {
  success: boolean;
  collectionKey: CollectionKey;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  rows: any[];
}

export interface MutationAuditItem {
  _id: string;
  collectionName: string;
  documentId: string;
  fieldName: string;
  previousValue: any;
  newValue: any;
  versionBefore: number;
  versionAfter: number;
  modifiedBy: {
    name?: string;
    role?: string;
    ipAddress?: string;
  };
  reason?: string;
  createdAt: string;
}

export const dataLakeApi = {
  listRows: async (
    collection: CollectionKey,
    params: { page?: number; limit?: number; search?: string } = {}
  ): Promise<DataLakeResponse> => {
    const { data } = await apiClient.get(`/hq/data-lake/${collection.toLowerCase()}`, { params });
    return data;
  },

  updateRow: async (
    collection: CollectionKey,
    id: string,
    updates: Record<string, any>,
    expectedVersion: number
  ): Promise<{ success: boolean; document: any; newVersion: number }> => {
    const { data } = await apiClient.patch(`/hq/data-lake/${collection.toLowerCase()}/${id}`, {
      updates,
      expectedVersion,
    });
    return data;
  },

  getAuditHistory: async (
    collection: CollectionKey,
    id: string
  ): Promise<{ success: boolean; data: MutationAuditItem[] }> => {
    const { data } = await apiClient.get(`/hq/data-lake/${collection.toLowerCase()}/${id}/audit`);
    return data;
  },
};
