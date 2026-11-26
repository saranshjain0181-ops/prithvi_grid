import type { UserRole } from '../db/models/UserAuthRoster';

/** JWT access token payload */
export interface JwtPayload {
  userId: string;
  role: UserRole;
  entityId: string;
  facilityId?: string;
  exp?: number;
  iat?: number;
}

/** Standard API success envelope */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/** Standard API error envelope */
export interface ApiError {
  success: false;
  error: string;
  message: string;
  details?: unknown;
}

/** Telemetry ingestion payload from hardware node */
export interface TelemetryIngestPayload {
  nodeId: string;
  /** AES-256-GCM encrypted JSON payload (hex) */
  encryptedPayload: string;
  /** IV used for AES-256-GCM encryption (hex) */
  iv: string;
  /** GCM auth tag (hex) */
  authTag: string;
  timestamp: string; // ISO8601
}

/** Decrypted telemetry reading from hardware */
export interface TelemetryReading {
  tempC: number;
  moisturePct: number;
  ph: number;
  methanePpm: number;
  airPressureHpa: number;
  batteryMv: number;
  signalRssi: number;
}

/** BullMQ job data for the verification queue */
export interface VerificationJobData {
  jobId: string;
  labourId: string;
  nodeId: string;
  boxId: string;
  facilityId: string;
  entityId: string;
  actionType: string;
  t0: string; // ISO8601
  managerId?: string;
}

/** BullMQ job data for the alert dispatch queue */
export interface AlertDispatchJobData {
  alertId: string;
  alertType: string;
  severity: string;
  facilityId: string;
  entityId: string;
  nodeId?: string;
  targetPhones: string[];
  message: string;
}

/** Pagination query params */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Time-range query params */
export interface TimeRangeQuery {
  from?: string;
  to?: string;
  limit?: number;
}

/** Chart query params */
export interface ChartQuery {
  days?: number;
  interval?: string;
}
