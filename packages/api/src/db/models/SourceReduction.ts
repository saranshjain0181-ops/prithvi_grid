/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 8
 * Source Reduction and Kitchen Waste Analytics
 * Prevention at source, cause tagging, cover normalisation, and honest savings estimation.
 * [LEGAL-REVIEW] Strict ward-level/outlet aggregation; zero individual employee or patient metrics.
 */

export type WasteCause =
  | 'PREPARATION_TRIMMING'
  | 'SPOILAGE_EXPIRY'
  | 'BUFFET_LEFTOVER'
  | 'PLATE_RETURN'
  | 'OTHER';

export type DriverType = 'COVERS' | 'MEALS_SERVED' | 'OCCUPIED_BEDS';

export interface SourceTag {
  tagId: string;
  binId: string;
  outletId: string; // kitchen outlet, ward pantry, canteen station
  mealPeriod: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'ALL_DAY';
  cause: WasteCause;
  weightKg: number;
  taggedAt: string;
}

export interface OutletScorecard {
  outletId: string;
  periodStart: string;
  periodEnd: string;
  totalWasteKg: number;
  wasteByCause: Record<WasteCause, number>;
  driverCount: number;
  driverType: DriverType;
  wastePerDriverKg: number;
  estimatedFoodCostSavedInr: number;
  isEstimated: boolean; // Honest uncertainty flag
  topHotspotCause: WasteCause;
  recommendations: string[];
}
