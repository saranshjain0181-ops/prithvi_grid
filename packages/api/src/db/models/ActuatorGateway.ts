/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 4
 * Field Actuator Gateway and Safe Automation
 * Unified physical actuator abstraction with hardware watchdogs and interlock fail-safes.
 * [EXPERT-REVIEW] Electrical safety, physical overrides, and progressive mode authorization.
 */

export type ActuatorType =
  | 'AERATION_BLOWER'
  | 'WATER_VALVE'
  | 'PUMP'
  | 'ALARM_BUZZER'
  | 'LIGHT'
  | 'COVER_WINCH';

export type AutomationMode = 'ADVISORY' | 'ASSISTED' | 'AUTOMATIC';
export type CommandStatus =
  | 'SENT'
  | 'CONFIRMED'
  | 'FAULT'
  | 'VETOED_INTERLOCK'
  | 'EXPIRED'
  | 'OVERRIDDEN_MANUAL';

export interface Actuator {
  actuatorId: string;
  siteId: string;
  name: string;
  type: ActuatorType;
  controllerId: string;
  currentMode: AutomationMode;
  maxRunSecondsPerCommand: number;
  dailyMaxSecondsBudget: number;
  currentDailySecondsUsed: number;
  lastCurrentAmpsReading?: number;
  status: 'ONLINE' | 'FAULT' | 'OFFLINE';
  manualOverrideActive: boolean;
  electricalSafetyCertifiedAt?: string;
}

export interface InterlockRule {
  interlockId: string;
  actuatorId: string;
  name: string;
  description: string;
  isTriggered: (context: Record<string, any>) => boolean;
  severity: 'BLOCKING';
}

export interface AutomationRule {
  ruleId: string;
  actuatorId: string;
  conditionDescription: string;
  actionSeconds: number;
  validPhases: string[];
  quietHours: { startHour: number; endHour: number };
  version: number;
  isEnabled: boolean;
}

export interface ActuatorCommand {
  commandId: string;
  idempotencyKey: string;
  actuatorId: string;
  targetDurationSeconds: number;
  mode: AutomationMode;
  issuedAt: string;
  expiresAt: string;
  confirmedAt?: string;
  measuredCurrentAmps?: number;
  status: CommandStatus;
  failureReason?: string;
}

export interface SafetyTrip {
  tripId: string;
  actuatorId: string;
  reason: string;
  timestamp: string;
  resetRequired: boolean;
}
