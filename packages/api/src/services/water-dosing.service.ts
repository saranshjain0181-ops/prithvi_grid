import { IDoseStage, WaterBudget } from '../db/models/WaterBudget.js';
import crypto from 'crypto';

export interface WaterDosingPlan {
  currentMoisturePct: number;
  targetMoisturePct: number;
  pileMassKg: number;
  waterNeededLiters: number;
  hoseFlowRateLpm: number;
  totalDurationSeconds: number;
  stages: IDoseStage[];
  guidanceText: string;
}

export class WaterDosingService {
  /**
   * Deterministically calculates water requirement to reach target moisture without runoff
   */
  calculateWaterDosing(params: {
    pileMassKg: number;
    currentMoisturePct: number;
    targetMoisturePct?: number; // default 55%
    hoseFlowRateLpm?: number; // default 15 L/min
  }): WaterDosingPlan {
    const targetMoisturePct = params.targetMoisturePct ?? 55;
    const hoseFlowRateLpm = params.hoseFlowRateLpm ?? 15;

    if (params.currentMoisturePct >= targetMoisturePct) {
      return {
        currentMoisturePct: params.currentMoisturePct,
        targetMoisturePct,
        pileMassKg: params.pileMassKg,
        waterNeededLiters: 0,
        hoseFlowRateLpm,
        totalDurationSeconds: 0,
        stages: [],
        guidanceText: `ढेर में पहले से पर्याप्त नमी है (${params.currentMoisturePct}%)। पानी डालने की आवश्यकता नहीं है। [NEEDS-NATIVE-REVIEW]`,
      };
    }

    // Mass balance: M_initial * (1 - MC_init) = M_final * (1 - MC_target)
    // M_final = M_initial * (1 - MC_init) / (1 - MC_target)
    // Water needed = M_final - M_initial (density of water = 1 kg/L)
    const initialDryFraction = 1 - params.currentMoisturePct / 100;
    const targetDryFraction = 1 - targetMoisturePct / 100;
    const targetTotalMassKg = (params.pileMassKg * initialDryFraction) / targetDryFraction;
    const waterNeededKg = Math.max(0, targetTotalMassKg - params.pileMassKg);
    const waterNeededLiters = Math.round(waterNeededKg);

    const totalSeconds = Math.round((waterNeededLiters / hoseFlowRateLpm) * 60);

    // Staging logic: split into 2 or 3 stages if > 30 liters to allow soak time and avoid leachate pooling
    const stages: IDoseStage[] = [];
    if (waterNeededLiters > 60) {
      const stageCount = 3;
      const litersPerStage = Math.round(waterNeededLiters / stageCount);
      for (let i = 1; i <= stageCount; i++) {
        stages.push({
          stageNumber: i,
          liters: i === stageCount ? waterNeededLiters - litersPerStage * 2 : litersPerStage,
          durationSeconds: Math.round((litersPerStage / hoseFlowRateLpm) * 60),
          restMinutesBeforeNext: 10,
        });
      }
    } else if (waterNeededLiters > 20) {
      const stageCount = 2;
      const litersPerStage = Math.round(waterNeededLiters / 2);
      stages.push({
        stageNumber: 1,
        liters: litersPerStage,
        durationSeconds: Math.round((litersPerStage / hoseFlowRateLpm) * 60),
        restMinutesBeforeNext: 10,
      });
      stages.push({
        stageNumber: 2,
        liters: waterNeededLiters - litersPerStage,
        durationSeconds: Math.round(((waterNeededLiters - litersPerStage) / hoseFlowRateLpm) * 60),
        restMinutesBeforeNext: 0,
      });
    } else if (waterNeededLiters > 0) {
      stages.push({
        stageNumber: 1,
        liters: waterNeededLiters,
        durationSeconds: totalSeconds,
        restMinutesBeforeNext: 0,
      });
    }

    const guidanceText = `कुल ${waterNeededLiters} लीटर पानी की जरूरत है। इसे ${stages.length} चरणों में छिड़कें ताकि पानी नीचे रिसकर लीचेट न बने। [NEEDS-NATIVE-REVIEW]`;

    return {
      currentMoisturePct: params.currentMoisturePct,
      targetMoisturePct,
      pileMassKg: params.pileMassKg,
      waterNeededLiters,
      hoseFlowRateLpm,
      totalDurationSeconds: totalSeconds,
      stages,
      guidanceText,
    };
  }

  /**
   * Persists water budget plan to db
   */
  async createWaterBudget(params: {
    entityId: string;
    facilityId: string;
    pitId: string;
    pileMassKg: number;
    currentMoisturePct: number;
    targetMoisturePct?: number;
    hoseFlowRateLpm?: number;
  }) {
    const budgetId = `WB-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const plan = this.calculateWaterDosing(params);

    const record = await WaterBudget.create({
      budgetId,
      entityId: params.entityId,
      facilityId: params.facilityId,
      pitId: params.pitId,
      currentMoisturePct: plan.currentMoisturePct,
      targetMoisturePct: plan.targetMoisturePct,
      pileMassKg: plan.pileMassKg,
      calculatedWaterLiters: plan.waterNeededLiters,
      hoseFlowRateLpm: plan.hoseFlowRateLpm,
      stages: plan.stages,
      status: 'PLANNED',
      notes: plan.guidanceText,
    });

    return { record, plan };
  }
}

export const waterDosingService = new WaterDosingService();
