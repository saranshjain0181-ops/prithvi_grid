import { createHash } from 'crypto';
import {
  FinanceProcurementView,
  MonthEndPack,
  SpendCategoryVariance,
} from '../db/models/FinanceProcurement';

export class FinanceProcurementService {
  public computeFinanceView(params: {
    tenantId: string;
    facilityId: string;
    month: string;
    categoriesData: {
      category: SpendCategoryVariance['category'];
      budgetInr: number;
      actualInr: number;
    }[];
    committedSpendInr: number;
    openPoCount: number;
    supplierExceptionsCount: number;
    foodWasteSavingsInr: number;
    compostRevenueInr: number;
  }): FinanceProcurementView {
    const categories: SpendCategoryVariance[] = [];
    let totalBudget = 0;
    let totalActual = 0;

    for (const c of params.categoriesData) {
      totalBudget += c.budgetInr;
      totalActual += c.actualInr;
      const variance = c.actualInr - c.budgetInr;
      const variancePct = c.budgetInr > 0 ? (variance / c.budgetInr) * 100 : 0;

      categories.push({
        category: c.category,
        budgetInr: c.budgetInr,
        actualInr: c.actualInr,
        varianceInr: variance,
        variancePct: Number(variancePct.toFixed(1)),
        driverExplanation:
          variance > 0
            ? `Price surge or volume overrun in ${c.category.toLowerCase()}`
            : 'Favourable variance within operating limits',
      });
    }

    const netBenefit = params.foodWasteSavingsInr + params.compostRevenueInr - totalActual;

    const packId = `PACK-${params.tenantId}-${params.month}`;
    const sealedHash = createHash('sha256')
      .update(`${packId}:${totalActual}:${netBenefit}:${Date.now()}`)
      .digest('hex');

    const pack: MonthEndPack = {
      packId,
      tenantId: params.tenantId,
      facilityId: params.facilityId,
      periodMonth: params.month,
      totalSpendInr: totalActual,
      totalCommittedSpendInr: params.committedSpendInr,
      foodWasteCostSavingsInr: params.foodWasteSavingsInr,
      compostRevenueInr: params.compostRevenueInr,
      netFinancialBenefitInr: netBenefit,
      isEstimated: true,
      unmatchedInvoicesCount: params.supplierExceptionsCount,
      sealedDocumentHash: sealedHash,
      generatedAt: new Date().toISOString(),
    };

    return {
      tenantId: params.tenantId,
      facilityId: params.facilityId,
      asOfMonth: params.month,
      categories,
      totalBudgetInr: totalBudget,
      totalActualInr: totalActual,
      totalCommittedInr: params.committedSpendInr,
      openPoCount: params.openPoCount,
      supplierExceptionsCount: params.supplierExceptionsCount,
      latestMonthEndPack: pack,
    };
  }
}
