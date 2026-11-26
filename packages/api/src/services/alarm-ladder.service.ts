import { LadderStep } from '../db/models/AlarmLadder.js';

export interface AlarmLadderEvaluationResult {
  alarmId: string;
  nextStep: LadderStep;
  isBuzzerAllowed: boolean;
  isQuietZoneSuppressed: boolean;
  quietZoneActionHindi?: string;
  voiceCallTargetRole?: string;
  piezoPattern?: 'SHORT_BEEP' | 'WARBLE_PULSE' | 'CONTINUOUS_SIREN';
}

export class AlarmLadderService {
  /**
   * Deterministically steps through alarm escalation ladder considering quiet zones and energy budgets
   */
  evaluateLadderStep(params: {
    alarmId: string;
    alarmType: 'ANAEROBIC_ODOR' | 'OVERHEATING' | 'FIRE_RISK' | 'TAMPER' | 'COLD_STALL';
    severity: 'WARNING' | 'CRITICAL' | 'EMERGENCY_SAFETY';
    minutesUnacknowledged: number;
    isInQuietZone?: boolean;
    quietZoneName?: string;
    supercapacitorVoltage?: number; // node energy check
  }): AlarmLadderEvaluationResult {
    let nextStep: LadderStep = 'IN_APP_WORKER';

    if (params.minutesUnacknowledged >= 120) {
      nextStep = 'NODE_PIEZO_BUZZER';
    } else if (params.minutesUnacknowledged >= 60) {
      nextStep = 'VOICE_CALL_ONCALL';
    } else if (params.minutesUnacknowledged >= 30) {
      nextStep = 'WALLBOARD_KIOSK';
    } else if (params.minutesUnacknowledged >= 15) {
      nextStep = 'PUSH_WHATSAPP_SUPERVISOR';
    }

    // Quiet Zone Rules
    let isBuzzerAllowed = true;
    let isQuietZoneSuppressed = false;
    let quietZoneActionHindi: string | undefined;

    if (params.isInQuietZone && nextStep === 'NODE_PIEZO_BUZZER') {
      // Fire risk bypasses quiet zone silence
      if (params.alarmType === 'FIRE_RISK' || params.severity === 'EMERGENCY_SAFETY') {
        isBuzzerAllowed = true;
        isQuietZoneSuppressed = false;
      } else {
        isBuzzerAllowed = false;
        isQuietZoneSuppressed = true;
        nextStep = 'VOICE_CALL_ONCALL'; // Fallback to urgent telephony voice call
        quietZoneActionHindi = `शांत क्षेत्र (${params.quietZoneName || 'अस्पताल/आवास'}) सक्रिय होने के कारण स्थानीय बज़र म्यूट किया गया। ऑन-कॉल अधिकारी को तत्काल वॉयस कॉल भेजी गई। [NEEDS-NATIVE-REVIEW]`;
      }
    }

    // Node Energy budget: if node supercapacitor voltage < 4.2V, buzzer is blocked to avoid node brownout
    if (nextStep === 'NODE_PIEZO_BUZZER' && params.supercapacitorVoltage && params.supercapacitorVoltage < 4.2) {
      isBuzzerAllowed = false;
      nextStep = 'VOICE_CALL_ONCALL';
    }

    let piezoPattern: 'SHORT_BEEP' | 'WARBLE_PULSE' | 'CONTINUOUS_SIREN' | undefined;
    if (nextStep === 'NODE_PIEZO_BUZZER' && isBuzzerAllowed) {
      if (params.alarmType === 'FIRE_RISK') {
        piezoPattern = 'CONTINUOUS_SIREN';
      } else if (params.alarmType === 'OVERHEATING') {
        piezoPattern = 'WARBLE_PULSE';
      } else {
        piezoPattern = 'SHORT_BEEP';
      }
    }

    return {
      alarmId: params.alarmId,
      nextStep,
      isBuzzerAllowed,
      isQuietZoneSuppressed,
      quietZoneActionHindi,
      voiceCallTargetRole: nextStep === 'VOICE_CALL_ONCALL' ? 'ON_CALL_FACILITY_MANAGER' : undefined,
      piezoPattern,
    };
  }

  /**
   * Applies remote silence with safety guardrails
   */
  applyRemoteSilence(params: {
    alarmType: string;
    severity: string;
    silencedReason: string;
    silenceDurationMinutes: number;
    userRole: string;
  }): { allowed: boolean; rejectedReason?: string; expiresAt?: Date } {
    if (params.alarmType === 'FIRE_RISK' || params.severity === 'EMERGENCY_SAFETY') {
      return {
        allowed: false,
        rejectedReason: 'SECURITY_INTERLOCK: Fire and emergency safety alarms cannot be silenced remotely without on-site confirmation. [LEGAL-REVIEW]',
      };
    }

    if (!params.silencedReason || params.silencedReason.trim().length < 5) {
      return {
        allowed: false,
        rejectedReason: 'AUDIT_REQUIRED: A valid explanation reason must be recorded to silence an alarm.',
      };
    }

    const duration = Math.min(120, Math.max(10, params.silenceDurationMinutes)); // max 2 hours
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    return {
      allowed: true,
      expiresAt,
    };
  }
}

export const alarmLadderService = new AlarmLadderService();
