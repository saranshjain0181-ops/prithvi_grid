import { IOperatingCostLedgerRecord, IStageCostAllocation } from '../db/models/OperatingCostLedger.js';
import crypto from 'crypto';

export interface CalculateOperatingCostInput {
  totalWasteProcessedKg: number;
  labourHoursInternal: number;
  hourlyInternalWageInr?: number; // default ₹100/hr
  contractorInvoiceCostInr?: number;
  bulkingMaterialKg: number;
  bulkingCostPerKgInr?: number; // default ₹2.5/kg
  waterLiters: number;
  waterTariffPerLiterInr?: number; // default ₹0.05/L
  shredderKwh: number;
  kwhTariffInr?: number; // default ₹8.0/kWh
  monthlyBudgetInr: number;
  crashIncidentsCount?: number;
  contaminationSortingHours?: number;
}

export interface OperatingCostEvaluation {
  totalCostInr: number;
  budgetInr: number;
  varianceInr: number;
  variancePercentage: number;
  costPerKgProcessedInr: number;
  isOverBudget: boolean;
  stageAllocations: IStageCostAllocation[];
  crashCostInr: number;
  contaminationCostInr: number;
  summaryMessage: string;
}

export class OperatingCostService {
  /**
   * Deterministically calculates monthly operating cost ledger and decomposes variance
   */
  calculateOperatingCost(input: CalculateOperatingCostInput): OperatingCostEvaluation {
    const internalLabourRate = input.hourlyInternalWageInr ?? 100;
    const bulkingRate = input.bulkingCostPerKgInr ?? 2.5;
    const waterRate = input.waterTariffPerLiterInr ?? 0.05;
    const electricRate = input.kwhTariffInr ?? 8.0;

    const labourCost = input.labourHoursInternal * internalLabourRate + (input.contractorInvoiceCostInr || 0);
    const materialCost = input.bulkingMaterialKg * bulkingRate;
    const utilityCost = input.waterLiters * waterRate + input.shredderKwh * electricRate;

    const totalCostInr = Math.round((labourCost + materialCost + utilityCost) * 100) / 100;
    const varianceInr = Math.round((totalCostInr - input.monthlyBudgetInr) * 100) / 100;
    const variancePercentage =
      input.monthlyBudgetInr > 0 ? Math.round((varianceInr / input.monthlyBudgetInr) * 1000) / 10 : 0;

    const costPerKgProcessedInr =
      input.totalWasteProcessedKg > 0
        ? Math.round((totalCostInr / input.totalWasteProcessedKg) * 100) / 100
        : 0;

    // Cost of problems
    // Acid crash cost: ~3 hrs extra turning + ₹300 buffer additives per incident
    const crashCostInr = (input.crashIncidentsCount || 0) * (3 * internalLabourRate + 300);
    // Contamination sorting cost
    const contaminationCostInr = (input.contaminationSortingHours || 0) * internalLabourRate;

    // Stage allocations (conventional ratios across 5 stages)
    const stageShares = {
      RECEIVING: 0.15,
      PREPARATION: 0.20,
      COMPOSTING: 0.35,
      CURING: 0.15,
      FINISHING: 0.15,
    };

    const stageAllocations: IStageCostAllocation[] = Object.entries(stageShares).map(([stage, share]) => {
      const allocated = Math.round(totalCostInr * share * 100) / 100;
      return {
        stage: stage as any,
        allocatedCostInr: allocated,
        costPerKgInr: input.totalWasteProcessedKg > 0 ? Math.round((allocated / input.totalWasteProcessedKg) * 100) / 100 : 0,
      };
    });

    const isOverBudget = varianceInr > 0;
    let summaryMessage = '';
    if (isOverBudget) {
      summaryMessage = `बजट से ₹${varianceInr.toLocaleString('en-IN')} (${variancePercentage}%) अधिक व्यय हुआ है। खाद प्रसंस्करण लागत ₹${costPerKgProcessedInr}/किग्रा है। [NEEDS-NATIVE-REVIEW]`;
    } else {
      summaryMessage = `मासिक बजट के भीतर संचालन (लागत ₹${costPerKgProcessedInr}/किग्रा)। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      totalCostInr,
      budgetInr: input.monthlyBudgetInr,
      varianceInr,
      variancePercentage,
      costPerKgProcessedInr,
      isOverBudget,
      stageAllocations,
      crashCostInr,
      contaminationCostInr,
      summaryMessage,
    };
  }
}

export const operatingCostService = new OperatingCostService();
