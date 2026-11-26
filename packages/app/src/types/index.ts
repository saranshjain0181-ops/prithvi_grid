// ─── Core Entities ───────────────────────────────────────────────────────────

export type Role = 'SAFAI_MITRA' | 'BWG_MANAGER' | 'SUPREME_HEAD'

export interface User {
  id: string
  name: string
  phone: string
  role: Role
  wardId?: string
  wardName?: string
  assignedBoxIds?: string[]
  assignedBoxes?: string[]
  assignedNodes?: string[]
  avatarUrl?: string
  createdAt?: string
}

export interface Tokens {
  accessToken: string
  refreshToken: string
}

// ─── Compost Infrastructure ───────────────────────────────────────────────────

export type BoxStatus = 'HEALTHY' | 'TURN_WASTE' | 'ADD_WATER' | 'EMERGENCY'

export interface PitNode {
  id: string
  label: string
  boxId: string
  isActive: boolean
}

export interface CompostBox {
  id: string
  name: string
  wardId: string
  location: string
  status: BoxStatus
  nodes: PitNode[]
  createdAt: string
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface TelemetryReading {
  id: string
  boxId: string
  nodeId: string
  temperature: number   // °C
  ph: number
  moisture: number      // %
  methane: number       // PPM
  timestamp: string
}

export interface TelemetryPoint {
  timestamp: string
  temperature: number
  ph: number
  moisture: number
  methane: number
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type ActionCategory = 'INPUTS' | 'ACTIONS' | 'MAINTENANCE' | 'REPORTING'

export type ActionType =
  | 'GEELA_KACHRA_DALA'
  | 'SOOKHE_PATTE_DALA'
  | 'PAANI_CHHIDKA'
  | 'GUD_PAANI_DALA'
  | 'NEEM_POWDER_DALA'
  | 'MITTI_DALI'
  | 'KACHRA_GHUMAYA'
  | 'KHAD_NIKALI'
  | 'CHHANAI_KI'
  | 'HAWA_DI'
  | 'LEVEL_EQUAL'
  | 'LAB_SAMPLE'
  | 'GADDHA_SHIFT'
  | 'SENSOR_SAAF'
  | 'BAARISH_COVER'
  | 'DRAIN_SAAF'
  | 'HARDWARE_CHECK'
  | 'KEEDE_REPORT'
  | 'BADBOO_CHECK'
  | 'EMERGENCY_REPORT'

export type VerificationStatus =
  | 'PENDING'
  | 'VERIFIED_GENUINE'
  | 'FAKE_FLAG'
  | 'MANAGER_OVERRIDE'

export interface ActionRecord {
  id: string
  userId: string
  userName: string
  actionType: ActionType
  boxId: string
  nodeId: string
  status: VerificationStatus
  managerRemark?: string
  managerId?: string
  photoUrl?: string
  timestamp: string
}

// ─── Diary ────────────────────────────────────────────────────────────────────

export type DiaryEntryType = 'KACHRA_DALA' | 'KHAD_NIKALI'

export interface DiaryEntry {
  id: string
  userId: string
  boxId: string
  nodeId: string
  entryType: DiaryEntryType
  quantityKg: number
  entryDate: string
  notes?: string
  createdAt: string
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Alert {
  id: string
  boxId: string
  nodeId: string
  severity: AlertSeverity
  message: string
  messageHi: string
  isAcknowledged: boolean
  triggeredAt: string
  acknowledgedAt?: string
  acknowledgedBy?: string
}

// ─── Roster ───────────────────────────────────────────────────────────────────

export interface RosterEntry {
  id: string
  userId: string
  userName: string
  boxId: string
  boxName: string
  shiftDate: string
  shiftStart: string
  shiftEnd: string
  assignedBy: string
}

// ─── KPI ─────────────────────────────────────────────────────────────────────

export interface KpiData {
  totalWasteInputKg: number
  totalCompostOutputKg: number
  activeBoxes: number
  totalBoxes: number
  averageTemperature: number
  alertCount: number
  workerCount: number
  pendingVerifications: number
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface TelemetryUpdateEvent {
  boxId: string
  nodeId: string
  reading: TelemetryReading
}

export interface AlertNewEvent {
  alert: Alert
}

export interface VerificationResultEvent {
  actionId: string
  status: VerificationStatus
  remark?: string
}
