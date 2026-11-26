/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 18
 * Hardware Reliability and Design Feedback Loop (FRACAS)
 * Failure Reporting, Analysis and Corrective Action System for Smart Spear nodes and probes.
 * [EXPERT-REVIEW] Engineering failure modes, MTBF, component lot recalls, and DCR tracking.
 */

export type FailureCategory = 'COMPONENT' | 'DESIGN' | 'INSTALLATION' | 'ENVIRONMENTAL' | 'USER_DAMAGE';

export interface FailureReport {
  reportId: string;
  nodeId: string;
  hardwareRevision: string;
  componentLot: string;
  firmwareVersion: string;
  failureCategory: FailureCategory;
  primaryFailureMode: 'PH_DRIFT' | 'MOISTURE_CORROSION' | 'SUPERCAP_DEGRADATION' | 'MODEM_FAULT' | 'ENCLOSURE_LEAK';
  symptomsDescription: string;
  reportedAt: string;
  fieldServiceCostInr: number;
}

export interface DesignChangeRequest {
  dcrId: string;
  title: string;
  affectedFailureMode: string;
  targetHardwareRevision: string;
  supplierActionRequired?: string;
  status: 'PROPOSED' | 'APPROVED_FOR_PILOT' | 'RELEASED_TO_FLEET';
  approvedByAuthorityMatrix: boolean;
  createdAt: string;
}

export interface ReliabilityMetrics {
  totalFailuresLogged: number;
  mtbfOperatingDays: number;
  warrantyCostPerNodeInr: number;
  failurePareto: { mode: string; count: number; percentage: number }[];
}
