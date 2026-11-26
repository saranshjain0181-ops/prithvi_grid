import { CuringStatus, CurePile, ICurePile, IScreeningYield } from '../db/models/CurePile.js';
import crypto from 'crypto';

export interface CuringMaturityEvaluation {
  daysInCure: number;
  targetMaturityDays: number;
  maturityStatus: CuringStatus;
  isReadyForScreening: boolean;
  recommendation: string;
}

export interface ScreeningYieldEvaluation {
  rawMassKg: number;
  fineCompostYieldKg: number;
  oversizeRejectsKg: number;
  yieldPercentage: number;
  reusableBulkingKg: number;
  bagsProduced5kg: number;
  bagsProduced25kg: number;
}

export class FinishingLineService {
  /**
   * Evaluates curing status based on elapsed curing days
   */
  evaluateCuringMaturity(params: {
    startDate: Date;
    currentDate?: Date;
    targetMaturityDays?: number; // default 21 days
  }): CuringMaturityEvaluation {
    const now = params.currentDate || new Date();
    const targetDays = params.targetMaturityDays || 21;
    const elapsedMs = Math.max(0, now.getTime() - params.startDate.getTime());
    const daysInCure = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

    let maturityStatus: CuringStatus = 'CURING';
    let isReadyForScreening = false;
    let recommendation = '';

    if (daysInCure >= targetDays && daysInCure <= targetDays + 14) {
      maturityStatus = 'MATURE';
      isReadyForScreening = true;
      recommendation = `खाद परिपक्व हो चुकी है (${daysInCure} दिन)। 4mm/8mm छलनी से छानने के लिए तैयार है। [NEEDS-NATIVE-REVIEW]`;
    } else if (daysInCure > targetDays + 14) {
      maturityStatus = 'OVER_CURED';
      isReadyForScreening = true;
      recommendation = `ढेर को ठीक हुए ${daysInCure} दिन हो गए हैं। पोषक तत्वों के ह्रास को रोकने के लिए तत्काल छानकर बैग में पैक करें। [NEEDS-NATIVE-REVIEW]`;
    } else {
      maturityStatus = 'CURING';
      isReadyForScreening = false;
      recommendation = `खाद अभी परिपक्व हो रही है (${daysInCure}/${targetDays} दिन)। छानने से पहले कम से कम ${targetDays - daysInCure} दिन और प्रतीक्षा करें। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      daysInCure,
      targetMaturityDays: targetDays,
      maturityStatus,
      isReadyForScreening,
      recommendation,
    };
  }

  /**
   * Deterministically calculates screening yields and packaging output
   */
  calculateScreeningYield(params: {
    rawMassKg: number;
    fineCompostYieldKg: number;
  }): ScreeningYieldEvaluation {
    const oversizeRejectsKg = Math.max(0, params.rawMassKg - params.fineCompostYieldKg);
    const yieldPercentage = params.rawMassKg > 0 ? Math.round((params.fineCompostYieldKg / params.rawMassKg) * 1000) / 10 : 0;
    const reusableBulkingKg = Math.round(oversizeRejectsKg * 0.9); // 90% of oversize woody material is clean reusable bulking

    const bagsProduced5kg = Math.floor(params.fineCompostYieldKg / 5);
    const bagsProduced25kg = Math.floor(params.fineCompostYieldKg / 25);

    return {
      rawMassKg: params.rawMassKg,
      fineCompostYieldKg: params.fineCompostYieldKg,
      oversizeRejectsKg,
      yieldPercentage,
      reusableBulkingKg,
      bagsProduced5kg,
      bagsProduced25kg,
    };
  }

  /**
   * Records a screening event on a cure pile in db
   */
  async recordScreening(params: {
    curePileId: string;
    rawMassKg: number;
    fineCompostYieldKg: number;
    moistureAtScreeningPct: number;
  }): Promise<{ pile: ICurePile; yieldData: ScreeningYieldEvaluation }> {
    const pile = await CurePile.findOne({ curePileId: params.curePileId });
    if (!pile) {
      throw new Error(`Cure pile ${params.curePileId} not found.`);
    }

    const yieldData = this.calculateScreeningYield({
      rawMassKg: params.rawMassKg,
      fineCompostYieldKg: params.fineCompostYieldKg,
    });

    pile.screeningYield = {
      screeningDate: new Date(),
      rawMassKg: params.rawMassKg,
      fineCompostYieldKg: params.fineCompostYieldKg,
      oversizeRejectsKg: yieldData.oversizeRejectsKg,
      yieldPercentage: yieldData.yieldPercentage,
      moistureAtScreeningPct: params.moistureAtScreeningPct,
    };
    pile.currentMassKg = yieldData.fineCompostYieldKg;

    await pile.save();
    return { pile, yieldData };
  }
}

export const finishingLineService = new FinishingLineService();
