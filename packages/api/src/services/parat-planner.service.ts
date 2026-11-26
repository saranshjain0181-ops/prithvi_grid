import { ILayerInput, IMixRecipeResult, MixMeter } from '../db/models/MixMeter.js';
import crypto from 'crypto';

export class ParatPlannerService {
  /**
   * Calculates blended C:N, blended moisture, and Free Air Space (FAS)
   * for a combination of feedstock layers.
   */
  calculateMixRecipe(layers: ILayerInput[]): IMixRecipeResult {
    let totalMassKg = 0;
    let totalWaterMassKg = 0;
    let totalDryCarbonKg = 0;
    let totalDryNitrogenKg = 0;
    let weightedBulkDensitySum = 0;

    for (const layer of layers) {
      totalMassKg += layer.massKg;
      const dryMassKg = layer.massKg * (1 - layer.moisturePercent / 100);
      const waterMassKg = layer.massKg * (layer.moisturePercent / 100);
      totalWaterMassKg += waterMassKg;

      // Assuming carbon is ~50% of organic dry matter
      const carbonKg = dryMassKg * 0.5;
      const nitrogenKg = carbonKg / Math.max(1, layer.carbonNitrogenRatio);

      totalDryCarbonKg += carbonKg;
      totalDryNitrogenKg += nitrogenKg;
      weightedBulkDensitySum += layer.bulkDensityKgPerM3 * layer.massKg;
    }

    if (totalMassKg === 0) {
      return {
        blendedCnRatio: 0,
        blendedMoisturePercent: 0,
        freeAirSpacePercent: 0,
        isOptimal: false,
        recommendedBulkingKg: 0,
        recommendedBucketsBulking: 0,
        warnings: ['No layers provided.'],
      };
    }

    const blendedMoisturePercent = Math.round((totalWaterMassKg / totalMassKg) * 1000) / 10;
    const blendedCnRatio =
      totalDryNitrogenKg > 0 ? Math.round((totalDryCarbonKg / totalDryNitrogenKg) * 10) / 10 : 30;

    const avgBulkDensity = weightedBulkDensitySum / totalMassKg;
    // Free Air Space estimation: FAS % = 100 * (1 - bulkDensity / particleDensity (~1000 kg/m3))
    const freeAirSpacePercent = Math.max(0, Math.min(100, Math.round(100 * (1 - avgBulkDensity / 1000))));

    const warnings: string[] = [];
    let isOptimal = true;

    // Optimal criteria: C:N 25-35, Moisture 50-60%, FAS 30-45%
    if (blendedCnRatio < 25) {
      warnings.push(`Low C:N (${blendedCnRatio}:1). Excess nitrogen may cause ammonia emissions.`);
      isOptimal = false;
    } else if (blendedCnRatio > 40) {
      warnings.push(`High C:N (${blendedCnRatio}:1). Excess carbon will retard microbial heating.`);
      isOptimal = false;
    }

    if (blendedMoisturePercent > 65) {
      warnings.push(`Excess moisture (${blendedMoisturePercent}%). High risk of compaction sludge and leachate.`);
      isOptimal = false;
    } else if (blendedMoisturePercent < 45) {
      warnings.push(`Dry pile (${blendedMoisturePercent}%). Moisture deficit will stall thermophilic decomposition.`);
      isOptimal = false;
    }

    if (freeAirSpacePercent < 30) {
      warnings.push(`Poor air porosity (${freeAirSpacePercent}% FAS). Aeration channels will collapse.`);
      isOptimal = false;
    }

    // Recommendation logic: if wet waste dominates, calculate sawdust/dry leaves needed to reach 55% moisture & 30:1 C:N
    let recommendedBulkingKg = 0;
    if (blendedMoisturePercent > 60 || blendedCnRatio < 25) {
      // Rule of thumb: approx 1 kg dry bulking (sawdust/leaves) per 4-5 kg wet waste excess
      const wetSurplusKg = totalMassKg * Math.max(0, (blendedMoisturePercent - 55) / 100);
      recommendedBulkingKg = Math.round(wetSurplusKg * 2);
    }
    const recommendedBucketsBulking = Math.ceil(recommendedBulkingKg / 2.5); // 1 bucket holds ~2.5 kg dry leaves/sawdust

    return {
      blendedCnRatio,
      blendedMoisturePercent,
      freeAirSpacePercent,
      isOptimal,
      recommendedBulkingKg,
      recommendedBucketsBulking,
      warnings,
    };
  }

  /**
   * Persists recipe mix in db
   */
  async recordMix(params: {
    entityId: string;
    facilityId: string;
    pitId: string;
    performedBy: string;
    layers: ILayerInput[];
  }) {
    const recordId = `MIX-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const recipeResult = this.calculateMixRecipe(params.layers);

    const record = await MixMeter.create({
      recordId,
      entityId: params.entityId,
      facilityId: params.facilityId,
      pitId: params.pitId,
      performedBy: params.performedBy,
      layers: params.layers,
      recipeResult,
    });

    return { record, recipeResult };
  }
}

export const paratPlannerService = new ParatPlannerService();
