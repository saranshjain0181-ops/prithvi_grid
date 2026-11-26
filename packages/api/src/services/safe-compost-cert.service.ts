import { Types } from 'mongoose';
import { SafeCompostCertificate, ISafeCompostCertificate } from '../db/models/SafeCompostCertificate';
import { CompostBatch } from '../db/models/CompostBatch';
import { merkleSealService } from './merkle-seal.service';

export interface EvaluateSafeCompostParams {
  batchId: string | Types.ObjectId;
  facilityId: string | Types.ObjectId;
  consecutiveHoursAbove55C: number;
  turningsCountDuringHotPhase: number;
  peakTempC: number;
  curingDurationDays: number;
  finalMoisturePct: number;
  finalPh: number;
  merkleSealRootHash?: string;
}

export class SafeCompostCertService {
  /**
   * Evaluates agronomic time and temperature sanitization criteria for a compost batch (Feature 7).
   */
  public async evaluateAndIssueCertificate(params: EvaluateSafeCompostParams): Promise<ISafeCompostCertificate> {
    const batchObjId = new Types.ObjectId(params.batchId.toString());
    const facilityObjId = new Types.ObjectId(params.facilityId.toString());

    // 1. Evaluate agronomic sanitization criteria (Standard: >= 72 consecutive hours >= 55°C, >= 2 turnings)
    let verdict: ISafeCompostCertificate['criteriaVerdict'] = 'CRITERIA_NOT_MET';
    if (
      params.consecutiveHoursAbove55C >= 72 &&
      params.turningsCountDuringHotPhase >= 2 &&
      params.peakTempC >= 58.0 &&
      params.curingDurationDays >= 14
    ) {
      verdict = 'CRITERIA_MET';
    } else if (params.consecutiveHoursAbove55C < 24) {
      verdict = 'INSUFFICIENT_EVIDENCE';
    }

    const certNum = `CERT-SAFE-${Date.now().toString().slice(-6)}`;
    const rootHash = params.merkleSealRootHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const cert = await SafeCompostCertificate.create({
      batchId: batchObjId,
      facilityId: facilityObjId,
      certificateNumber: certNum,
      consecutiveHoursAbove55C: params.consecutiveHoursAbove55C,
      turningsCountDuringHotPhase: params.turningsCountDuringHotPhase,
      peakTempC: params.peakTempC,
      curingDurationDays: params.curingDurationDays,
      finalMoisturePct: params.finalMoisturePct,
      finalPh: params.finalPh,
      criteriaVerdict: verdict,
      evidenceStrengthTier: verdict === 'CRITERIA_MET' ? 'STRONG' : 'MODERATE',
      merkleSealRootHash: rootHash,
      issuedAt: new Date(),
    });

    return cert;
  }
}

export const safeCompostCertService = new SafeCompostCertService();
