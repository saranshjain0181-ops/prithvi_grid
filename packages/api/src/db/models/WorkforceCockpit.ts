/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 22
 * Workforce Cockpit
 * Privacy-first aggregated human resource view: coverage, skills, thermal ergonomics, and resilience.
 * [LEGAL-REVIEW] Strict privacy bounds: group size >= 5, zero individual performance ranking.
 */

export interface CompetencyCoverage {
  competency: 'SHREDDER_OPERATOR' | 'FORKLIFT_DRIVER' | 'LAB_SAMPLE_TAKER' | 'HAZARD_SUPERVISOR';
  certifiedWorkersCount: number;
  expiringIn30DaysCount: number;
  isSinglePointOfFailure: boolean;
}

export interface WorkforceCockpitView {
  tenantId: string;
  facilityId: string;
  asOfDate: string;
  totalWorkforceHeadcount: number;
  isGroupPrivacyProtected: boolean; // true if >= 5 workers
  shiftCoverageGapsHours: number;
  competencies: CompetencyCoverage[];
  heatRestAdherencePct: number;
  huddleParticipationPct: number;
  ideasSubmittedLast30Days: number;
  resilienceRiskSummary: string[];
}
