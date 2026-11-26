/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 21
 * Client Finance and Procurement Cockpit
 * Integrated cost ledger, 3-way match, committed spend, food waste savings, and sealed month-end pack.
 * [LEGAL-REVIEW] Tax positions, financial certification boundaries and wage privacy.
 */

export interface SpendCategoryVariance {
  category: 'LABOUR' | 'BULKING_SUPPLIES' | 'EQUIPMENT_MAINTENANCE' | 'OFFSITE_CONSIGNMENTS' | 'UTILITIES';
  budgetInr: number;
  actualInr: number;
  varianceInr: number;
  variancePct: number;
  driverExplanation: string;
}

export interface MonthEndPack {
  packId: string;
  tenantId: string;
  facilityId: string;
  periodMonth: string;
  totalSpendInr: number;
  totalCommittedSpendInr: number;
  foodWasteCostSavingsInr: number;
  compostRevenueInr: number;
  netFinancialBenefitInr: number;
  isEstimated: boolean;
  unmatchedInvoicesCount: number;
  sealedDocumentHash: string;
  generatedAt: string;
}

export interface FinanceProcurementView {
  tenantId: string;
  facilityId: string;
  asOfMonth: string;
  categories: SpendCategoryVariance[];
  totalBudgetInr: number;
  totalActualInr: number;
  totalCommittedInr: number;
  openPoCount: number;
  supplierExceptionsCount: number;
  latestMonthEndPack?: MonthEndPack;
}
