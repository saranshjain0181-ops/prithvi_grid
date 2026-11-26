/**
 * @prithvi/shared
 * Shared TypeScript types, enums, and interfaces used across all Prithvi Grid packages.
 * Import from this module: import { UserRole, TelemetryReading } from '@prithvi/shared'
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export enum UserRole {
  SUPREME_HEAD = 'SUPREME_HEAD',
  BWG_MANAGER = 'BWG_MANAGER',
  SAFAI_MITRA = 'SAFAI_MITRA',
}

export enum FacilityStatus {
  HEALTHY = 'HEALTHY',
  ACID_CRASH_RISK = 'ACID_CRASH_RISK',
  ANAEROBIC_DANGER = 'ANAEROBIC_DANGER',
  SENSOR_OFFLINE = 'SENSOR_OFFLINE',
  BOX_FULL = 'BOX_FULL',
  HARDWARE_TAMPERED = 'HARDWARE_TAMPERED',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED_GENUINE = 'VERIFIED_GENUINE',
  FAKE_FLAG = 'FAKE_FLAG',
  MANAGER_OVERRIDE = 'MANAGER_OVERRIDE',
}

export enum AlertType {
  ACID_CRASH = 'ACID_CRASH',
  METHANE_SPIKE = 'METHANE_SPIKE',
  ODOR_WARNING = 'ODOR_WARNING',
  PIT_FULL = 'PIT_FULL',
  HARDWARE_TAMPER = 'HARDWARE_TAMPER',
}

export enum ActionType {
  // Safai Mitra field actions
  PICKUP_LOGGED = 'PICKUP_LOGGED',
  PHOTO_UPLOADED = 'PHOTO_UPLOADED',
  BOX_EMPTIED = 'BOX_EMPTIED',
  ROUTE_STARTED = 'ROUTE_STARTED',
  ROUTE_COMPLETED = 'ROUTE_COMPLETED',
  // Verification actions
  VERIFICATION_PASSED = 'VERIFICATION_PASSED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  MANAGER_OVERRIDE_APPROVED = 'MANAGER_OVERRIDE_APPROVED',
  MANAGER_OVERRIDE_REJECTED = 'MANAGER_OVERRIDE_REJECTED',
  // Facility / pit actions
  PIT_ADDITIVE_APPLIED = 'PIT_ADDITIVE_APPLIED',
  PIT_TURNED = 'PIT_TURNED',
  PIT_SEALED = 'PIT_SEALED',
  PIT_EMPTIED = 'PIT_EMPTIED',
  FACILITY_INSPECTION = 'FACILITY_INSPECTION',
  // Alert actions
  ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED',
  ALERT_RESOLVED = 'ALERT_RESOLVED',
  ESCALATION_SENT = 'ESCALATION_SENT',
  // Admin / HQ actions
  USER_CREATED = 'USER_CREATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  NODE_ASSIGNED = 'NODE_ASSIGNED',
  NODE_DECOMMISSIONED = 'NODE_DECOMMISSIONED',
  THRESHOLD_UPDATED = 'THRESHOLD_UPDATED',
  REPORT_GENERATED = 'REPORT_GENERATED',
}

export enum NodeStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  LOW_BATTERY = 'LOW_BATTERY',
  SIGNAL_WEAK = 'SIGNAL_WEAK',
  TAMPERED = 'TAMPERED',
}

export enum CompostPhase {
  FRESH_INPUT = 'FRESH_INPUT',
  ACTIVE_DECOMPOSITION = 'ACTIVE_DECOMPOSITION',
  CURING = 'CURING',
  MATURE = 'MATURE',
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY
// ─────────────────────────────────────────────────────────────────────────────

export interface TelemetryReading {
  nodeId: string;
  facilityId: string;
  timestamp: Date;
  /** Temperature in degrees Celsius */
  tempC: number;
  /** Moisture content as a percentage (0–100) */
  moisturePct: number;
  /** pH value (0–14) */
  ph: number;
  /** Methane concentration in parts per million */
  methanePpm: number;
  /** Air pressure in hectopascals (used as compaction indicator) */
  airPressureHpa: number;
  /** Node battery voltage in millivolts */
  batteryMv: number;
  /** LoRa signal strength (RSSI) in dBm */
  signalRssi: number;
}

export interface TelemetrySummary {
  facilityId: string;
  windowStart: Date;
  windowEnd: Date;
  avgTempC: number;
  avgMoisturePct: number;
  avgPh: number;
  maxMethanePpm: number;
  avgAirPressureHpa: number;
  minBatteryMv: number;
  sampleCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  /** entityId references the BWG entity this user belongs to */
  entityId: string;
  /** IDs of IMC boxes assigned to this user (Safai Mitras) */
  assignedBoxes: string[];
  /** IDs of sensor nodes this user monitors */
  assignedNodes: string[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface AuthToken {
  userId: string;
  role: UserRole;
  entityId: string;
  iat: number;
  exp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACILITIES (Compost Pits / IMC Boxes)
// ─────────────────────────────────────────────────────────────────────────────

export interface Facility {
  id: string;
  entityId: string;
  facilityName: string;
  gpsLat: number;
  gpsLong: number;
  /** IMC Zone / Ward name */
  imcZone: string;
  status: FacilityStatus;
  compostPhase: CompostPhase;
  /** Pit capacity fill percentage (0–100) */
  fillPct: number;
  assignedSafaiMitraIds: string[];
  sensorNodeId?: string;
  createdAt: Date;
  lastUpdatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SENSOR NODES
// ─────────────────────────────────────────────────────────────────────────────

export interface SensorNode {
  id: string;
  deviceEui: string;
  facilityId: string;
  status: NodeStatus;
  firmwareVersion: string;
  lastSeenAt: Date;
  batteryMv: number;
  signalRssi: number;
  tamperDetected: boolean;
  installDate: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface VerificationRecord {
  id: string;
  safaiMitraId: string;
  facilityId: string;
  photoUrl: string;
  gpsLat: number;
  gpsLong: number;
  submittedAt: Date;
  status: VerificationStatus;
  /** AI confidence score (0–1) */
  aiConfidenceScore?: number;
  aiReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  overrideReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS (Sanjivani)
// ─────────────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  facilityId: string;
  alertType: AlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  /** Raw telemetry snapshot at time of alert */
  telemetrySnapshot?: Partial<TelemetryReading>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ODOR PREDICTION
// ─────────────────────────────────────────────────────────────────────────────

export interface OdorPrediction {
  facilityId: string;
  predictedAt: Date;
  forecastWindowHours: number;
  riskScore: number; // 0–100
  riskLevel: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  contributingFactors: string[];
  weatherContext: {
    tempC: number;
    humidity: number;
    windSpeedKmh: number;
    windDirection: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PIT MONITOR
// ─────────────────────────────────────────────────────────────────────────────

export interface PitMonitorStatus {
  facilityId: string;
  updatedAt: Date;
  fillPct: number;
  estimatedDaysToFull: number;
  lastEmptiedAt?: Date;
  lastTurnedAt?: Date;
  lastAdditiveAppliedAt?: Date;
  currentPhase: CompostPhase;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION LOG
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionLog {
  id: string;
  actionType: ActionType;
  performedBy: string;
  targetEntityId?: string;
  targetFacilityId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY (BWG / Municipality)
// ─────────────────────────────────────────────────────────────────────────────

export interface Entity {
  id: string;
  entityName: string;
  entityType: 'BWG' | 'ULB' | 'MUNICIPAL_CORPORATION';
  city: string;
  state: string;
  contactEmail: string;
  contactPhone: string;
  totalFacilities: number;
  activeNodes: number;
  isActive: boolean;
  onboardedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI THRESHOLDS (configurable per entity)
// ─────────────────────────────────────────────────────────────────────────────

export interface AIThresholds {
  /** Minimum healthy temperature (°C) */
  tempMin: number;
  /** Maximum healthy temperature (°C) */
  tempMax: number;
  /** Minimum healthy moisture (%) */
  moistureMin: number;
  /** Maximum healthy moisture (%) */
  moistureMax: number;
  /** Methane level triggering a warning alert (ppm) */
  methaneAlert: number;
  /** Methane level triggering a critical alert (ppm) */
  methaneCritical: number;
  /** pH below which an acid crash alert fires */
  phAcidCrash: number;
  /** Air pressure above which compaction alert fires (hPa) */
  pressureCompactionAlert: number;
  /** How long to wait after photo upload before AI verification runs (ms) */
  verificationWaitMs: number;
  /** Time without a telemetry ping before node is marked OFFLINE (ms) */
  nodeOfflineTimeoutMs: number;
  /** Pit fill percentage above which a BOX_FULL alert fires */
  pitCapacityAlertPct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET.IO EVENT PAYLOADS
// ─────────────────────────────────────────────────────────────────────────────

export interface SocketTelemetryEvent {
  event: 'telemetry:update';
  payload: TelemetryReading;
}

export interface SocketAlertEvent {
  event: 'alert:new';
  payload: Alert;
}

export interface SocketFacilityStatusEvent {
  event: 'facility:status_change';
  payload: { facilityId: string; oldStatus: FacilityStatus; newStatus: FacilityStatus };
}

export type SocketEvent =
  | SocketTelemetryEvent
  | SocketAlertEvent
  | SocketFacilityStatusEvent;

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  statusCode: number;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5: FLEET LIFECYCLE, SUPERCAPACITOR & OTA FIRMWARE
// ─────────────────────────────────────────────────────────────────────────────

export type DeviceLifecycleStatus =
  | 'PROVISIONED'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'DECOMMISSIONED';

export type OtaRolloutStatus =
  | 'DRAFT'
  | 'CANARY'
  | 'GENERAL_AVAILABILITY'
  | 'PAUSED'
  | 'ROLLED_BACK'
  | 'DEPRECATED';

export interface SupercapacitorMetrics {
  voltageMv: number;
  vDropBurstMv: number;
  tegDeltaTC: number;
  harvestEfficiencyPct: number;
  estimatedEsrMilliOhms: number;
  healthScorePct: number;
  brownoutRisk: 'LOW' | 'MODERATE' | 'CRITICAL';
}

export interface NodeFleetItem {
  id: string;
  assetCode: string;
  name: string;
  facilityId: string;
  facilityName: string;
  entityId: string;
  status: DeviceLifecycleStatus;
  firmwareVersion: string;
  hardwareRevision: string;
  lastSeenAt?: string;
  supercapacitor: SupercapacitorMetrics;
  signalRssi: number;
  uptimeSeconds?: number;
  resetCount?: number;
  macAddress?: string;
  imei?: string;
}

export interface OtaReleaseSummary {
  id: string;
  version: string;
  hardwareRevision: string;
  binaryUrl: string;
  sha256: string;
  fileSizeBytes: number;
  minSupercapVoltageMv: number;
  minRssiDbm: number;
  rolloutStatus: OtaRolloutStatus;
  canaryPercentage: number;
  metrics: {
    stagedCount: number;
    downloadedCount: number;
    successCount: number;
    failedRollbackCount: number;
    failureRatePct: number;
  };
  isCircuitBreakerTripped: boolean;
  releaseNotes: string;
  createdAt: string;
}

