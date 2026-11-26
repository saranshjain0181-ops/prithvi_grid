import { FreshnessGrade, WasteAgeClock } from '../db/models/WasteAgeClock.js';
import crypto from 'crypto';

export interface WasteAgeEvaluation {
  ageHours: number;
  freshnessGrade: FreshnessGrade;
  bufferingRecommended: boolean;
  woodAshGramsRecommended: number;
  dryBulkingKgRecommended: number;
  instructions: string;
}

export class WasteAgeService {
  /**
   * Deterministically evaluates the age and fermentation risk of a collected waste batch
   */
  evaluateWasteAge(params: {
    generatedAt: Date;
    loadedAt: Date;
    wasteMassKg: number;
  }): WasteAgeEvaluation {
    const ageMs = Math.max(0, params.loadedAt.getTime() - params.generatedAt.getTime());
    const ageHours = Math.round((ageMs / (1000 * 60 * 60)) * 10) / 10;

    let freshnessGrade: FreshnessGrade = 'FRESH';
    let bufferingRecommended = false;
    let woodAshGramsRecommended = 0;
    let dryBulkingKgRecommended = 0;
    let instructions = '';

    if (ageHours < 12) {
      freshnessGrade = 'FRESH';
      instructions = 'कचरा ताजा है। सामान्य परत विधि (Parat Planner) के अनुसार गड्ढे में लोड करें। [NEEDS-NATIVE-REVIEW]';
    } else if (ageHours <= 24) {
      freshnessGrade = 'FERMENTING';
      bufferingRecommended = true;
      // Pre-dose extra dry bulking to absorb volatile acids
      dryBulkingKgRecommended = Math.round(params.wasteMassKg * 0.1);
      instructions = `कचरा ${ageHours} घंटे पुराना है और सड़न शुरू हो चुकी है। एसिड क्रैश रोकने के लिए ${dryBulkingKgRecommended} किग्रा सूखा कार्बन (भूसा/पत्ते) मिलाएँ। [NEEDS-NATIVE-REVIEW]`;
    } else {
      freshnessGrade = 'SOUR_CRITICAL';
      bufferingRecommended = true;
      // Pre-dose both dry bulking and wood ash alkaline buffer (200g ash per 100kg waste)
      dryBulkingKgRecommended = Math.round(params.wasteMassKg * 0.2);
      woodAshGramsRecommended = Math.round((params.wasteMassKg / 100) * 200);
      instructions = `[CRITICAL-ACID-RISK] कचरा ${ageHours} घंटे पुराना और खट्टा हो चुका है। तत्काल ${woodAshGramsRecommended} ग्राम लकड़ी की राख और ${dryBulkingKgRecommended} किग्रा सूखा कार्बन मिलाकर ही लोड करें। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      ageHours,
      freshnessGrade,
      bufferingRecommended,
      woodAshGramsRecommended,
      dryBulkingKgRecommended,
      instructions,
    };
  }

  /**
   * Records a waste batch age tracking entry in db
   */
  async recordWasteLoading(params: {
    entityId: string;
    facilityId: string;
    sourceZone: 'MAIN_KITCHEN' | 'BANQUET_HALL' | 'HOSPITAL_DIETETICS' | 'GUEST_ROOM_FLOORS' | 'TOWNSHIP_WARD';
    generatedAt: Date;
    loadedAt: Date;
    wasteMassKg: number;
    loadedToPitId: string;
    holdingBinId?: string;
  }) {
    const batchId = `WST-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const evalResult = this.evaluateWasteAge({
      generatedAt: params.generatedAt,
      loadedAt: params.loadedAt,
      wasteMassKg: params.wasteMassKg,
    });

    const record = await WasteAgeClock.create({
      batchId,
      entityId: params.entityId,
      facilityId: params.facilityId,
      sourceZone: params.sourceZone,
      generatedAt: params.generatedAt,
      loadedAt: params.loadedAt,
      holdingBinId: params.holdingBinId,
      loadedToPitId: params.loadedToPitId,
      ageHoursAtLoading: evalResult.ageHours,
      freshnessGrade: evalResult.freshnessGrade,
      bufferingRecommended: evalResult.bufferingRecommended,
      woodAshGramsRecommended: evalResult.woodAshGramsRecommended,
      dryBulkingKgRecommended: evalResult.dryBulkingKgRecommended,
      status: 'LOADED',
    });

    return { record, evaluation: evalResult };
  }
}

export const wasteAgeService = new WasteAgeService();
