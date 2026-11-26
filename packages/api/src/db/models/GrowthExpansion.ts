/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 24
 * Growth and Expansion Cockpit
 * Supreme Head & sales leadership cockpit: funnel, account expansion signals, and city launch readiness.
 */

export interface ExpansionSignal {
  signalId: string;
  tenantId: string;
  facilityId: string;
  signalType: 'CAPACITY_EXHAUSTION_SOON' | 'HIGH_OFFSITE_DIVERSION_COST' | 'EXCELLENT_TRUST_HIGH_ADOPTION';
  evidenceSummary: string;
  suggestedAction: string;
  raisedAt: string;
}

export interface CityLaunchReadiness {
  cityName: string;
  regulatoryCatalogueMapped: boolean;
  localLabPartnerOnboarded: boolean;
  installerFieldPartnerTrained: boolean;
  anchorClientsSignedCount: number;
  overallReadinessPct: number;
  launchStatus: 'SCOPING' | 'PREPARATION' | 'READY_TO_LAUNCH';
}

export interface GrowthExpansionView {
  asOfDate: string;
  activeNodesFleetCount: number;
  pipelineDealsCount: number;
  conversionRatePct: number;
  activePilotsCount: number;
  pilotsAtRiskCount: number;
  expansionSignals: ExpansionSignal[];
  citiesReadiness: CityLaunchReadiness[];
  grossMarginPerNodeInr: number;
}
