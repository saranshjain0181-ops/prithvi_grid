import { DayCloseRecord, DayCloseStatus, IDayCloseChecklist, IDayCloseRecord } from '../db/models/DayCloseRecord.js';
import crypto from 'crypto';

export interface DayCloseEvaluation {
  canCloseCleanly: boolean;
  status: DayCloseStatus;
  variances: string[];
  summaryMessage: string;
}

export class DayCloseService {
  /**
   * Deterministically evaluates day close checklist and identifies variances
   */
  evaluateDayClose(checklist: IDayCloseChecklist): DayCloseEvaluation {
    const variances: string[] = [];

    if (!checklist.allPitsCovered) {
      variances.push('Pits left uncovered or tarpaulins unfastened (rain/fly risk).');
    }
    if (!checklist.toolsReturnedAndLocked) {
      variances.push('Tools (forks, wheelbarrows, PPE) not returned to tool shed.');
    }
    if (!checklist.waterTapsLocked) {
      variances.push('Water taps or hose line not shut off (flooding risk).');
    }
    if (!checklist.leachateSumpChecked) {
      variances.push('Leachate sump level was not verified.');
    }
    if (!checklist.scaleCalibrationVerified) {
      variances.push('Weighing scale did not pass daily calibration test.');
    }
    if (checklist.unverifiedTasksCount > 0) {
      variances.push(`${checklist.unverifiedTasksCount} task(s) remain unverified or pending supervisor review.`);
    }

    const canCloseCleanly = variances.length === 0;
    const status: DayCloseStatus = canCloseCleanly ? 'SUBMITTED' : 'VARIANCE_FLAGGED';

    let summaryMessage = '';
    if (canCloseCleanly) {
      summaryMessage = 'दिन का कार्य सफलतापूर्वक पूर्ण हुआ। सभी जाँच बिंदु सत्यापित हैं। [NEEDS-NATIVE-REVIEW]';
    } else {
      summaryMessage = `दिन के क्लोज में ${variances.length} भिन्नता/त्रुटियाँ पाई गईं। मैनेजर समीक्षा आवश्यक है। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      canCloseCleanly,
      status,
      variances,
      summaryMessage,
    };
  }

  /**
   * Shift Lead submits Day Close
   */
  async submitDayClose(params: {
    entityId: string;
    facilityId: string;
    shiftDate: string;
    shiftType: 'MORNING' | 'EVENING' | 'NIGHT';
    submittedBy: string;
    checklist: IDayCloseChecklist;
    varianceNotes?: string;
  }) {
    const evaluation = this.evaluateDayClose(params.checklist);
    const closeId = `DC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const record = await DayCloseRecord.create({
      closeId,
      entityId: params.entityId,
      facilityId: params.facilityId,
      shiftDate: params.shiftDate,
      shiftType: params.shiftType,
      submittedBy: params.submittedBy,
      checklist: params.checklist,
      varianceNotes: params.varianceNotes || (evaluation.variances.length > 0 ? evaluation.variances.join('; ') : undefined),
      status: evaluation.status,
    });

    return { record, evaluation };
  }

  /**
   * Facility Manager signs off and closes the day
   */
  async approveDayClose(params: {
    closeId: string;
    managerUserId: string;
  }) {
    const record = await DayCloseRecord.findOne({ closeId: params.closeId });
    if (!record) {
      throw new Error(`Day Close record ${params.closeId} not found.`);
    }

    record.approvedBy = params.managerUserId;
    record.approvedAt = new Date();
    record.status = 'APPROVED_CLOSED';
    await record.save();

    return record;
  }
}

export const dayCloseService = new DayCloseService();
