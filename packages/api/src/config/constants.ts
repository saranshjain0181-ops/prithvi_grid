/** AI threshold constants for Prithvi Grid compost monitoring */
export interface AiThresholdsConfig {
  TEMP_MIN: number;
  TEMP_MAX: number;
  MOISTURE_MIN: number;
  MOISTURE_MAX: number;
  METHANE_ALERT: number;
  METHANE_CRITICAL: number;
  PH_ACID_CRASH: number;
  PRESSURE_COMPACTION_ALERT: number;
  VERIFICATION_WAIT_MS: number;
  NODE_OFFLINE_TIMEOUT_MS: number;
  PIT_CAPACITY_ALERT_PCT: number;
  METHANE_RISE_RATE_PPM_PER_HR: number;
  ODOR_PREDICTION_WINDOW_HRS: number;
  SANJIVANI_TEMP_TRIGGER: number;
  VERIFICATION_DELTA: {
    TEMP_MIN_CHANGE: number;
    MOISTURE_MIN_CHANGE: number;
    PRESSURE_MIN_CHANGE: number;
  };
}

export const AI_THRESHOLDS: AiThresholdsConfig = {
  /** Optimal composting temperature range (°C) */
  TEMP_MIN: 55,
  TEMP_MAX: 65,

  /** Optimal moisture content range (%) */
  MOISTURE_MIN: 40,
  MOISTURE_MAX: 60,

  /** Methane alert levels (PPM) */
  METHANE_ALERT: 300,
  METHANE_CRITICAL: 450,

  /** pH level at which acid crash is detected */
  PH_ACID_CRASH: 5.2,

  /** Atmospheric pressure threshold indicating compaction (hPa) */
  PRESSURE_COMPACTION_ALERT: 1015,

  /** Labour verification wait window (15 minutes in ms) */
  VERIFICATION_WAIT_MS: 15 * 60 * 1000,

  /** Time after which a node is considered offline (30 minutes in ms) */
  NODE_OFFLINE_TIMEOUT_MS: 30 * 60 * 1000,

  /** Pit fill percentage at which PIT_FULL alert is triggered */
  PIT_CAPACITY_ALERT_PCT: 95,

  /** Minimum methane rate of change per hour (PPM/hr) to trigger odour warning */
  METHANE_RISE_RATE_PPM_PER_HR: 50,

  /** Number of hours of telemetry history used for odour prediction */
  ODOR_PREDICTION_WINDOW_HRS: 6,

  /** Temperature below which (combined with low pH) triggers Sanjivani alert (°C) */
  SANJIVANI_TEMP_TRIGGER: 40,

  /** Sensor delta thresholds for labour verification */
  VERIFICATION_DELTA: {
    TEMP_MIN_CHANGE: 1.0,    // °C
    MOISTURE_MIN_CHANGE: 2.0, // %
    PRESSURE_MIN_CHANGE: 0.5, // hPa
  },
};

/** Role hierarchy weights — higher number = higher privilege */
export const ROLE_WEIGHTS = {
  SUPREME_HEAD: 100,
  BWG_MANAGER: 50,
  SAFAI_MITRA: 10,
  AUDITOR_GUEST: 5,
} as const;

/** BullMQ queue names */
export const QUEUE_NAMES = {
  VERIFICATION: 'kaam-ka-saboot',
  ALERT_DISPATCH: 'alert-dispatch',
  ODOR_PREDICTOR: 'odor-predictor',
  TELEMETRY_INGEST: 'telemetry-ingest',
  TELEMETRY_DLQ: 'telemetry-dlq',
} as const;

/** Socket.IO event names */
export const SOCKET_EVENTS = {
  TELEMETRY_UPDATE: 'telemetry:update',
  ALERT_NEW: 'alert:new',
  VERIFICATION_RESULT: 'verification:result',
  NODE_OFFLINE: 'node:offline',
  PIT_FULL: 'pit:full',
  SANJIVANI_TRIGGER: 'sanjivani:trigger',
} as const;

/** Alert types used in AiAlertSanjivani */
export const ALERT_TYPES = {
  ACID_CRASH: 'ACID_CRASH',
  ODOR_WARNING: 'ODOR_WARNING',
  PIT_FULL: 'PIT_FULL',
  METHANE_HIGH: 'METHANE_HIGH',
  METHANE_CRITICAL: 'METHANE_CRITICAL',
  TEMP_LOW: 'TEMP_LOW',
  TEMP_HIGH: 'TEMP_HIGH',
  MOISTURE_LOW: 'MOISTURE_LOW',
  MOISTURE_HIGH: 'MOISTURE_HIGH',
  NODE_OFFLINE: 'NODE_OFFLINE',
  COMPACTION_ALERT: 'COMPACTION_ALERT',
} as const;
