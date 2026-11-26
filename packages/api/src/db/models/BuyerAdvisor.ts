/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 12
 * Buyer Application Advisor
 * Tailored application rates, crop profiles, conductivity warnings, and grounded agronomic guidance.
 * [EXPERT-REVIEW] Agronomic ratios and [LEGAL-REVIEW] edible crop claims boundary.
 */

export interface CropProfile {
  cropId: string;
  name: string;
  category: 'SEEDLING_TRAY' | 'POTTED_PLANTS' | 'VEGETABLE_BED' | 'FRUIT_TREES' | 'FIELD_CROPS';
  recommendedRateGramsPerPlant?: [number, number];
  recommendedRateKgPerSqm?: [number, number];
  maxConductivityDsPerM: number; // e.g. 1.5 for seedlings, 3.5 for mature field crops
  recommendedPottingMixRatioPct: number; // e.g. 10% - 20%
  cautions: string[];
}

export interface ApplicationGuidance {
  guidanceId: string;
  lotNumber: string;
  cropId: string;
  measuredLotConductivity: number;
  measuredLotPh: number;
  isSuitabilityMet: boolean;
  recommendedDoseDisplay: string;
  advisoryTextHindi: string; // [NEEDS-NATIVE-REVIEW]
  advisoryTextEnglish: string;
  dilutionRequired: boolean;
  alternativeRecommendedCrop?: string;
  claimsGatePassed: boolean;
}
