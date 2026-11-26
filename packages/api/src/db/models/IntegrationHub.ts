/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 3
 * Integration Hub and Mapping Studio
 * Enterprise connector catalogue, visual transform mappings, and staging isolation.
 * [LEGAL-REVIEW] Data-processing boundaries and credential hygiene.
 */

export type ConnectorType =
  | 'FILE_DROP'
  | 'REST_PULL'
  | 'WEBHOOK_RECEIVE'
  | 'SPREADSHEET_LINK'
  | 'EMAIL_TO_RECORD'
  | 'OUTBOUND_WEBHOOK';

export type SyncStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
export type StagingStatus = 'VALID' | 'ERROR' | 'APPLIED' | 'REJECTED';

export interface Connector {
  connectorId: string;
  tenantId: string;
  name: string;
  type: ConnectorType;
  endpointOrPath: string;
  secretKeyRef: string;
  dataScope: 'BANQUET_BOOKINGS' | 'HOSPITAL_CENSUS' | 'HR_HOURS' | 'ACCOUNTING_EXPORT';
  isActive: boolean;
  rateLimitPerMin: number;
}

export interface MappingSpec {
  mappingId: string;
  connectorId: string;
  targetEntity: string;
  fieldMap: Record<string, string>;
  transforms: Record<string, 'PARSE_DATE' | 'KG_TO_TONNES' | 'LOOKUP_ZONE' | 'DEFAULT_VAL'>;
  version: number;
  status: 'DRAFT' | 'APPROVED';
}

export interface StagingRecord {
  stagingId: string;
  runId: string;
  externalKey: string;
  rawPayload: Record<string, any>;
  transformedPayload?: Record<string, any>;
  validationErrors: string[];
  status: StagingStatus;
  appliedAt?: string;
}

export interface SyncRun {
  runId: string;
  connectorId: string;
  startedAt: string;
  completedAt?: string;
  rowsProcessed: number;
  rowsStaged: number;
  errorsCount: number;
  status: SyncStatus;
  freshnessLagHours: number;
}

export interface OutboundSubscription {
  subscriptionId: string;
  tenantId: string;
  targetWebhookUrl: string;
  subscribedEvents: string[];
  secretSignatureKey: string;
  retryMaxCount: number;
  isActive: boolean;
}
