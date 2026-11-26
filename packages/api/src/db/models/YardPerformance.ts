/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 20
 * Yard Performance Cockpit
 * Plant-level productivity: Overall Equipment Effectiveness (OEE), Loss Tree, and stage bottlenecks.
 */

export interface LossTreeItem {
  cause: 'WAITING_FOR_MATERIAL_OR_LABOUR' | 'EQUIPMENT_DOWNTIME' | 'CONTAMINATION_REWORK' | 'UNPLANNED_EVENTS';
  capacityLostKg: number;
  sharePct: number;
  primaryRemedyFeature: string;
}

export interface YardPerformanceView {
  facilityId: string;
  periodStart: string;
  periodEnd: string;
  totalTheoreticalCapacityKg: number;
  actualThroughputProcessedKg: number;
  availabilityPct: number; // e.g. 88.5%
  performancePct: number;  // e.g. 92.0%
  qualityFirstPassPct: number; // e.g. 95.0%
  yardEfficiencyIndexPct: number; // Availability * Performance * Quality
  lossTree: LossTreeItem[];
  bottleneckStage: 'INTAKE_SORTING' | 'SHREDDING' | 'THERMOPHILIC_TURNING' | 'CURING' | 'SCREENING_BAGGING';
  isBenchmarkPeerComparisonAvailable: boolean;
}
