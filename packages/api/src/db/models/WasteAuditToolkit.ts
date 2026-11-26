/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 9
 * Waste Characterisation Audit Toolkit
 * Standardised audit protocol, stratified sampling, and statistical confidence intervals.
 * [EXPERT-REVIEW] Sampling methodology and biohazard stop-rule.
 */

export type SortCategoryType =
  | 'FOOD_COOKED'
  | 'FOOD_RAW'
  | 'GARDEN_GREEN'
  | 'PAPER_CARDBOARD'
  | 'PLASTICS_RIGID'
  | 'PLASTICS_FILM'
  | 'GLASS'
  | 'METALS'
  | 'TEXTILES'
  | 'SANITARY_HYGIENE'
  | 'BIOMEDICAL_SUSPECT'
  | 'OTHER_RESIDUAL';

export interface AuditSample {
  sampleId: string;
  auditPlanId: string;
  sourceLocation: string;
  sampledAt: string;
  totalMassKg: number;
  categoryWeights: Partial<Record<SortCategoryType, number>>;
  hasBiomedicalSuspect: boolean;
}

export interface CategoryComposition {
  category: SortCategoryType;
  massFractionPct: number;
  confidenceIntervalPct: [number, number]; // 95% CI
  isCompostable: boolean;
  isRecyclable: boolean;
}

export interface AuditReport {
  auditPlanId: string;
  facilityId: string;
  conductedDate: string;
  totalSamplesCount: number;
  totalMassAuditedKg: number;
  compositions: CategoryComposition[];
  compostableSharePct: number;
  recyclableSharePct: number;
  residualSharePct: number;
  isStatisticallySignificant: boolean;
  reportSealHash: string;
}
