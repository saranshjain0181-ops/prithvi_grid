import { EquipmentAsset, IEquipmentAsset } from '../db/models/EquipmentAsset.js';
import { ScaleCalibrationCheck, IScaleCalibrationCheck } from '../db/models/ScaleCalibrationCheck.js';
import crypto from 'crypto';

export interface ScaleCheckSubmission {
  entityId: string;
  facilityId: string;
  equipmentId: string;
  checkDate: string; // YYYY-MM-DD
  performedBy: string;
  referenceWeightGrams: number;
  observedWeightGrams: number;
  photoProofUrl?: string;
  notes?: string;
}

export interface ScaleVerificationResult {
  isVerified: boolean;
  status: 'PASS' | 'FAIL' | 'WARN';
  errorGrams: number;
  toleranceAllowedGrams: number;
  errorPercentage: number;
  message: string;
}

export class EquipmentRegisterService {
  /**
   * Pure deterministic evaluation of a scale calibration check against certified tolerance
   */
  evaluateScaleCheck(params: {
    referenceWeightGrams: number;
    observedWeightGrams: number;
    maxToleranceGrams?: number;
  }): ScaleVerificationResult {
    const tolerance = params.maxToleranceGrams ?? 50; // default 50g tolerance for platform scales
    const errorGrams = Math.abs(params.observedWeightGrams - params.referenceWeightGrams);
    const errorPercentage = (errorGrams / params.referenceWeightGrams) * 100;

    let status: 'PASS' | 'FAIL' | 'WARN' = 'PASS';
    let message = 'Scale within certified operating tolerance.';

    if (errorGrams > tolerance) {
      status = 'FAIL';
      message = `[AUDIT-GATE-FAIL] Scale error of ${errorGrams}g exceeds allowed tolerance of ${tolerance}g. Weighment invalid for compliance.`;
    } else if (errorGrams > tolerance * 0.7) {
      status = 'WARN';
      message = `Scale is drifting (${errorGrams}g error). Schedule recalibration soon.`;
    }

    return {
      isVerified: status === 'PASS' || status === 'WARN',
      status,
      errorGrams,
      toleranceAllowedGrams: tolerance,
      errorPercentage: Math.round(errorPercentage * 1000) / 1000,
      message,
    };
  }

  /**
   * Verifies if a scale record & recent calibration satisfies the weighment gate
   */
  evaluateWeighmentGate(params: {
    scaleStatus: string;
    dailyCheckRequired: boolean;
    lastCheckStatus?: 'PASS' | 'FAIL' | 'WARN';
    lastCheckDate?: string;
    targetDate: string;
    errorGrams?: number;
    toleranceAllowedGrams?: number;
  }): { canWeigh: boolean; reason: string } {
    if (params.scaleStatus === 'OUT_OF_SERVICE' || params.scaleStatus === 'MAINTENANCE_REQUIRED') {
      return { canWeigh: false, reason: `Scale is flagged as ${params.scaleStatus}.` };
    }

    if (!params.dailyCheckRequired) {
      return { canWeigh: true, reason: 'Scale does not require daily calibration check.' };
    }

    if (!params.lastCheckDate || params.lastCheckDate !== params.targetDate) {
      return {
        canWeigh: false,
        reason: `Scale has not completed a valid reference calibration check on ${params.targetDate}.`,
      };
    }

    if (params.lastCheckStatus === 'FAIL') {
      return {
        canWeigh: false,
        reason: `Scale failed daily calibration check on ${params.targetDate} (error ${params.errorGrams}g > ${params.toleranceAllowedGrams}g).`,
      };
    }

    return {
      canWeigh: true,
      reason: `Scale verified with error ${params.errorGrams}g (tolerance ${params.toleranceAllowedGrams}g).`,
    };
  }

  /**
   * Registers or updates an equipment asset in the yard
   */
  async registerAsset(data: Partial<IEquipmentAsset>): Promise<IEquipmentAsset> {
    const equipmentId = data.equipmentId || `EQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const asset = await EquipmentAsset.findOneAndUpdate(
      { equipmentId },
      { ...data, equipmentId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return asset;
  }

  /**
   * Performs daily scale calibration test and records audit check in db
   */
  async recordScaleCheck(submission: ScaleCheckSubmission): Promise<ScaleVerificationResult & { checkRecord?: IScaleCalibrationCheck }> {
    const scale = await EquipmentAsset.findOne({
      equipmentId: submission.equipmentId,
      facilityId: submission.facilityId,
    });

    const evalResult = this.evaluateScaleCheck({
      referenceWeightGrams: submission.referenceWeightGrams,
      observedWeightGrams: submission.observedWeightGrams,
      maxToleranceGrams: scale?.maxToleranceGrams,
    });

    if (evalResult.status === 'FAIL' && scale) {
      scale.status = 'MAINTENANCE_REQUIRED';
      await scale.save();
    }

    const checkId = `CHK-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const checkRecord = await ScaleCalibrationCheck.create({
      checkId,
      entityId: submission.entityId,
      facilityId: submission.facilityId,
      equipmentId: submission.equipmentId,
      checkDate: submission.checkDate,
      performedBy: submission.performedBy,
      referenceWeightGrams: submission.referenceWeightGrams,
      observedWeightGrams: submission.observedWeightGrams,
      errorGrams: evalResult.errorGrams,
      toleranceAllowedGrams: evalResult.toleranceAllowedGrams,
      status: evalResult.status,
      photoProofUrl: submission.photoProofUrl,
      notes: submission.notes,
    });

    return {
      ...evalResult,
      checkRecord,
    };
  }
}

export const equipmentRegisterService = new EquipmentRegisterService();
