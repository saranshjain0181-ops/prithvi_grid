// ─── Facility / Entity Types ──────────────────────────────────────────────────

export type FacilityStatus =
  | 'HEALTHY'
  | 'ACID_CRASH_RISK'
  | 'ANAEROBIC_DANGER'
  | 'SENSOR_OFFLINE'
  | 'BOX_FULL'
  | 'HARDWARE_TAMPERED';

export type OrgType = 'RWA' | 'School' | 'Hospital' | 'Market' | 'Other';
export type ArchType = 'Single' | 'Master-Slave Array';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Entity {
  id: string;
  clientName: string;
  orgType: OrgType;
  phone: string;
  email: string;
  swmRegNo: string;
  billingAddress: string;
  imcZone: string;
  imcWard: string;
  createdAt: string;
}

export interface Facility {
  id: string;
  entityId: string;
  facilityName: string;
  coordinates: Coordinates;
  status: FacilityStatus;
  lastPing: string;
  sensors: {
    temperature: number;
    moisture: number;
    methane: number;
    ph: number;
    pressure: number;
  };
}

export interface CompostBox {
  boxNo: number;
  capacityKg: number;
  nodesCount: number;
  nodes: CompostNode[];
}

export interface CompostNode {
  nodeNo: number;
  mac: string;
  imei: string;
  simNo: string;
  qrCode?: string;
}

// ─── KPI Types ────────────────────────────────────────────────────────────────

export interface KpiData {
  fleetMRR: number;
  fleetMRRTrend: number; // percent change
  dataPacketsToday: number;
  lastPacketAt: string;
  activeLabours: number;
  totalLabours: number;
  violationsPrevented: number;
}

// ─── Fleet Types ──────────────────────────────────────────────────────────────

export type NodeStatus = 'ONLINE' | 'OFFLINE' | 'TAMPERED' | 'LOW_BATTERY';

export interface FleetNode {
  id: string;
  mac: string;
  imei: string;
  simNo: string;
  facilityId: string;
  facilityName: string;
  boxNo: number;
  status: NodeStatus;
  batteryLevel: number;
  lastSeen: string;
  firmwareVersion: string;
  alarmActive: boolean;
}

// ─── Threshold / Config Types ─────────────────────────────────────────────────

export interface ThresholdConfig {
  tempMin: number;
  tempMax: number;
  moistureMin: number;
  moistureMax: number;
  methaneAlert: number;
  methaneCritical: number;
  phAcidCrash: number;
  pressureCompaction: number;
  verificationWaitMins: number;
  nodeOfflineTimeoutMins: number;
}

// ─── Data Lake Types ──────────────────────────────────────────────────────────

export type DataLakeTab =
  | 'Entities'
  | 'Facilities'
  | 'Users'
  | 'Assets'
  | 'Telemetry'
  | 'Ledger'
  | 'Diary'
  | 'Alerts';

// ─── Compliance Types ─────────────────────────────────────────────────────────

export interface ComplianceRecord {
  id: string;
  facilityId: string;
  facilityName: string;
  reportDate: string;
  violationType: string;
  status: 'OPEN' | 'CLOSED' | 'PREVENTED';
  resolvedAt?: string;
  notes: string;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface HQUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: 'SUPREME_HEAD' | 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST';
  token?: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Onboarding Wizard State ──────────────────────────────────────────────────

export interface OnboardingFormData {
  // Step 1
  clientName: string;
  orgType: OrgType;
  phone: string;
  email: string;
  swmRegNo: string;
  billingAddress: string;
  imcZone: string;
  imcWard: string;
  // Step 2
  facilityName: string;
  coordinates: Coordinates | null;
  // Step 3
  noOfBoxes: number;
  architecture: ArchType;
  boxes: CompostBox[];
  // Step 4  (nodes filled inside boxes)
  // Step 5
  managerPhone: string;
  otp: string;
  otpSent: boolean;
  otpVerified: boolean;
  qrCodes: string[];
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface SocketKpiUpdate {
  type: 'KPI_UPDATE';
  payload: Partial<KpiData>;
}

export interface SocketFacilityUpdate {
  type: 'FACILITY_STATUS_UPDATE';
  payload: { facilityId: string; status: FacilityStatus; sensors: Facility['sensors']; lastPing: string };
}
