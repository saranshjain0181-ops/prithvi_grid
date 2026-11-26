import { IFormulaIngredient, IManureProductFormula, ManureProductFormula } from '../db/models/ManureProductFormula.js';
import crypto from 'crypto';

export interface FormulaCostingResult {
  rawCostPerKgInr: number;
  totalCostPerBagInr: number;
  recommendedRetailPriceInr: number;
  grossMarginPercentage: number;
  grossProfitPerBagInr: number;
}

export class FormulatorService {
  /**
   * Deterministically calculates production cost, pricing, and gross margin
   */
  calculateFormulaCosting(params: {
    ingredients: IFormulaIngredient[];
    packagingCostPerBagInr: number;
    bagSizeKg: number;
    targetGrossMarginPercentage?: number; // e.g. 50%
  }): FormulaCostingResult {
    let rawCostPerKg = 0;
    let totalWeightPercentage = 0;

    for (const ing of params.ingredients) {
      totalWeightPercentage += ing.percentageByWeight;
      rawCostPerKg += (ing.percentageByWeight / 100) * ing.costPerKgInr;
    }

    rawCostPerKg = Math.round(rawCostPerKg * 100) / 100;
    const rawCostPerBag = rawCostPerKg * params.bagSizeKg;
    const totalCostPerBagInr = Math.round((rawCostPerBag + params.packagingCostPerBagInr) * 100) / 100;

    const targetMargin = (params.targetGrossMarginPercentage || 50) / 100;
    // RRP = Cost / (1 - Margin)
    const recommendedRetailPriceInr = Math.ceil(totalCostPerBagInr / (1 - targetMargin));
    const grossProfitPerBagInr = Math.round((recommendedRetailPriceInr - totalCostPerBagInr) * 100) / 100;
    const grossMarginPercentage =
      recommendedRetailPriceInr > 0
        ? Math.round((grossProfitPerBagInr / recommendedRetailPriceInr) * 1000) / 10
        : 0;

    return {
      rawCostPerKgInr: rawCostPerKg,
      totalCostPerBagInr,
      recommendedRetailPriceInr,
      grossMarginPercentage,
      grossProfitPerBagInr,
    };
  }

  /**
   * Creates or updates a value-added manure formula in db
   */
  async createFormula(params: {
    entityId: string;
    productName: string;
    targetAudience: 'COMMERCIAL_NURSERY' | 'TERRACE_GARDENER' | 'FARMER' | 'LANDSCAPER';
    ingredients: IFormulaIngredient[];
    packagingCostPerBagInr: number;
    bagSizeKg: number;
    targetGrossMarginPercentage?: number;
    applicationInstructionsHi: string;
    applicationInstructionsEn: string;
  }): Promise<IManureProductFormula> {
    const formulaId = `FORM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const costing = this.calculateFormulaCosting({
      ingredients: params.ingredients,
      packagingCostPerBagInr: params.packagingCostPerBagInr,
      bagSizeKg: params.bagSizeKg,
      targetGrossMarginPercentage: params.targetGrossMarginPercentage,
    });

    const formula = await ManureProductFormula.create({
      formulaId,
      entityId: params.entityId,
      productName: params.productName,
      targetAudience: params.targetAudience,
      ingredients: params.ingredients,
      rawCostPerKgInr: costing.rawCostPerKgInr,
      packagingCostPerBagInr: params.packagingCostPerBagInr,
      bagSizeKg: params.bagSizeKg,
      recommendedRetailPriceInr: costing.recommendedRetailPriceInr,
      grossMarginPercentage: costing.grossMarginPercentage,
      applicationInstructionsHi: params.applicationInstructionsHi,
      applicationInstructionsEn: params.applicationInstructionsEn,
      status: 'ACTIVE',
    });

    return formula;
  }
}

export const formulatorService = new FormulatorService();
