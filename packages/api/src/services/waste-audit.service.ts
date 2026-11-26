import { createHash } from 'crypto';
import {
  AuditSample,
  AuditReport,
  CategoryComposition,
  SortCategoryType,
} from '../db/models/WasteAuditToolkit';

export class WasteAuditService {
  private samples: AuditSample[] = [];

  public recordSample(sample: AuditSample): {
    sample: AuditSample;
    biohazardAlertTriggered: boolean;
  } {
    this.samples.push(sample);

    let biohazardAlertTriggered = false;
    if (sample.hasBiomedicalSuspect || (sample.categoryWeights.BIOMEDICAL_SUSPECT || 0) > 0) {
      biohazardAlertTriggered = true;
      // Stop rule: biohazard immediately triggers incident chain
    }

    return { sample, biohazardAlertTriggered };
  }

  public generateAuditReport(auditPlanId: string, facilityId: string): AuditReport {
    const planSamples = this.samples.filter((s) => s.auditPlanId === auditPlanId);
    if (planSamples.length === 0) {
      throw new Error(`No audit samples recorded for plan ${auditPlanId}`);
    }

    let totalMassAuditedKg = 0;
    const categoryTotals: Partial<Record<SortCategoryType, number>> = {};

    for (const sample of planSamples) {
      totalMassAuditedKg += sample.totalMassKg;
      for (const [cat, mass] of Object.entries(sample.categoryWeights)) {
        const catKey = cat as SortCategoryType;
        categoryTotals[catKey] = (categoryTotals[catKey] || 0) + (mass || 0);
      }
    }

    const compostableCategories: SortCategoryType[] = ['FOOD_COOKED', 'FOOD_RAW', 'GARDEN_GREEN'];
    const recyclableCategories: SortCategoryType[] = [
      'PAPER_CARDBOARD',
      'PLASTICS_RIGID',
      'GLASS',
      'METALS',
    ];

    let compostableKg = 0;
    let recyclableKg = 0;
    let residualKg = 0;

    const compositions: CategoryComposition[] = [];
    const n = planSamples.length;

    for (const [cat, totalCatKg] of Object.entries(categoryTotals)) {
      const catKey = cat as SortCategoryType;
      const fractionPct = totalMassAuditedKg > 0 ? (totalCatKg / totalMassAuditedKg) * 100 : 0;

      // Sample variance & 95% Confidence Interval
      const sampleFractions = planSamples.map((s) => {
        const sTotal = s.totalMassKg || 1;
        return ((s.categoryWeights[catKey] || 0) / sTotal) * 100;
      });

      const mean = sampleFractions.reduce((a, b) => a + b, 0) / n;
      const variance =
        n > 1
          ? sampleFractions.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1)
          : 0;
      const stdErr = Math.sqrt(variance / n);
      const marginOfError = Math.min(15, Number((1.96 * stdErr).toFixed(1))); // 95% t/z margin

      const ciLower = Math.max(0, Number((fractionPct - marginOfError).toFixed(1)));
      const ciUpper = Math.min(100, Number((fractionPct + marginOfError).toFixed(1)));

      const isCompostable = compostableCategories.includes(catKey);
      const isRecyclable = recyclableCategories.includes(catKey);

      if (isCompostable) compostableKg += totalCatKg;
      else if (isRecyclable) recyclableKg += totalCatKg;
      else residualKg += totalCatKg;

      compositions.push({
        category: catKey,
        massFractionPct: Number(fractionPct.toFixed(1)),
        confidenceIntervalPct: [ciLower, ciUpper],
        isCompostable,
        isRecyclable,
      });
    }

    const reportSealHash = createHash('sha256')
      .update(`${auditPlanId}:${facilityId}:${totalMassAuditedKg}:${Date.now()}`)
      .digest('hex');

    return {
      auditPlanId,
      facilityId,
      conductedDate: new Date().toISOString(),
      totalSamplesCount: n,
      totalMassAuditedKg: Number(totalMassAuditedKg.toFixed(2)),
      compositions,
      compostableSharePct: Number(((compostableKg / (totalMassAuditedKg || 1)) * 100).toFixed(1)),
      recyclableSharePct: Number(((recyclableKg / (totalMassAuditedKg || 1)) * 100).toFixed(1)),
      residualSharePct: Number(((residualKg / (totalMassAuditedKg || 1)) * 100).toFixed(1)),
      isStatisticallySignificant: n >= 5,
      reportSealHash,
    };
  }
}
