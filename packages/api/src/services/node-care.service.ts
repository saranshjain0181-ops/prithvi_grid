import { CareRound, ICareRound, ICareRoundChecklist } from '../db/models/CareRound.js';
import crypto from 'crypto';

export interface RecordCareRoundInput {
  entityId: string;
  facilityId: string;
  nodeId: string;
  performedBy: string;
  roundDate: string; // YYYY-MM-DD
  checklist: ICareRoundChecklist;
  photoBeforeUrl?: string;
  photoAfterUrl?: string;
  workerNotes?: string;
  telemetryBefore?: {
    tegDeltaTC: number;
    voltageMv: number;
  };
  telemetryAfter?: {
    tegDeltaTC: number;
    voltageMv: number;
  };
}

export interface CareRoundResult {
  truckRollAvoided: boolean;
  costSavedInr: number;
  harvestReboundPercent: number;
  escalationNeeded: boolean;
  feedbackMessage: string;
}

export class NodeCareService {
  /**
   * Deterministic evaluation of care round light maintenance actions & telemetry rebound
   */
  evaluateCareRound(params: {
    checklist: ICareRoundChecklist;
    telemetryBefore?: { tegDeltaTC: number; voltageMv: number };
    telemetryAfter?: { tegDeltaTC: number; voltageMv: number };
  }): CareRoundResult {
    let harvestReboundPercent = 0;
    const tegDeltaTBefore = params.telemetryBefore?.tegDeltaTC;
    const tegDeltaTAfter = params.telemetryAfter?.tegDeltaTC;

    if (tegDeltaTBefore !== undefined && tegDeltaTAfter !== undefined && tegDeltaTBefore > 0) {
      harvestReboundPercent = Math.max(0, ((tegDeltaTAfter - tegDeltaTBefore) / tegDeltaTBefore) * 100);
    }

    // Determine if escalation to field technician is needed
    const physicalIntegrityCompromised = !params.checklist.tamperSealIntact || !params.checklist.physicalSpearVertical;
    const persistentHarvestFailure =
      params.checklist.heatsinkFinsCleaned && tegDeltaTAfter !== undefined && tegDeltaTAfter < 2.0;

    const requiresEscalation = physicalIntegrityCompromised || persistentHarvestFailure;
    const truckRollAvoided =
      !requiresEscalation &&
      (params.checklist.heatsinkFinsCleaned || params.checklist.referenceJunctionDesalted);
    const costSavedInr = truckRollAvoided ? 750 : 0;

    let feedbackMessage = '';
    if (truckRollAvoided) {
      feedbackMessage =
        'शाबाश! आपने हीट-सिंक फिन्स और प्रोब साफ कर दिए हैं। थर्मल ग्रेडिएंट और एनर्जी संचयन सुधर गया है। फील्ड विजिट की जरूरत नहीं पड़ी। [NEEDS-NATIVE-REVIEW]';
    } else if (requiresEscalation) {
      feedbackMessage =
        'सावधानी: नोड की शारीरिक स्थिति या सील में खराबी पाई गई है। फील्ड इंजीनियर को री-कमीशनिंग हेतु सूचित किया जा रहा है। [NEEDS-NATIVE-REVIEW]';
    } else {
      feedbackMessage = 'देखभाल राउंड दर्ज कर लिया गया है। [NEEDS-NATIVE-REVIEW]';
    }

    return {
      truckRollAvoided,
      costSavedInr,
      harvestReboundPercent: Math.round(harvestReboundPercent * 10) / 10,
      escalationNeeded: requiresEscalation,
      feedbackMessage,
    };
  }

  /**
   * Processes a light-maintenance round performed by yard staff and persists to db.
   */
  async recordCareRound(input: RecordCareRoundInput): Promise<CareRoundResult & { round: ICareRound }> {
    const roundId = `CARE-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const evaluation = this.evaluateCareRound({
      checklist: input.checklist,
      telemetryBefore: input.telemetryBefore,
      telemetryAfter: input.telemetryAfter,
    });

    const round = await CareRound.create({
      roundId,
      entityId: input.entityId,
      facilityId: input.facilityId,
      nodeId: input.nodeId,
      performedBy: input.performedBy,
      roundDate: input.roundDate,
      checklist: input.checklist,
      telemetryVerification: {
        tegDeltaTBefore: input.telemetryBefore?.tegDeltaTC,
        tegDeltaTAfter: input.telemetryAfter?.tegDeltaTC,
        harvestReboundPercent: evaluation.harvestReboundPercent,
        voltageRecoveryMv:
          input.telemetryBefore && input.telemetryAfter
            ? Math.max(0, input.telemetryAfter.voltageMv - input.telemetryBefore.voltageMv)
            : 0,
        truckRollAvoided: evaluation.truckRollAvoided,
      },
      photoBeforeUrl: input.photoBeforeUrl,
      photoAfterUrl: input.photoAfterUrl,
      workerNotes: input.workerNotes,
      aiFeedbackGuidance: evaluation.feedbackMessage,
      requiresEscalation: evaluation.escalationNeeded,
    });

    return {
      ...evaluation,
      round,
    };
  }
}

export const nodeCareService = new NodeCareService();
