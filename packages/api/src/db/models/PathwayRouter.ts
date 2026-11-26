/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 7
 * Waste Pathway Router and External Processor Handoff
 * Deterministic destination routing and licensed external consignment handoff.
 * [LEGAL-REVIEW] Transfer manifests, licensed processor registry, and biomedical waste exclusion.
 */

export type WastePathway =
  | 'HOT_COMPOST_PIT'
  | 'PRE_PROCESS_THEN_COMPOST'
  | 'VERMICOMPOST_FEED'
  | 'COOL_HOLDING_AREA'
  | 'EXTERNAL_PROCESSOR'
  | 'REJECT';

export interface ExternalProcessor {
  processorId: string;
  name: string;
  licenseNumber: string;
  licenseExpiresAt: string;
  acceptedStreams: string[];
  maxDailyCapacityKg: number;
  ratePerKgInr: number;
  isActive: boolean;
}

export interface RoutingDecision {
  decisionId: string;
  containerId: string;
  streamType: string;
  massKg: number;
  recommendedPathway: WastePathway;
  targetEntityId?: string; // pitId, bedId, processorId
  reasons: string[];
  isOverridden: boolean;
  chosenPathway: WastePathway;
  overrideReason?: string;
  timestamp: string;
}

export interface Consignment {
  consignmentId: string;
  externalProcessorId: string;
  containerIds: string[];
  streamType: string;
  sentWeightKg: number;
  receivedWeightKg?: number;
  discrepancyKg?: number;
  discrepancyFlagged: boolean;
  vehicleNumber: string;
  manifestDocRef: string;
  createdAt: string;
  confirmedAt?: string;
  status: 'DISPATCHED' | 'CONFIRMED' | 'DISCREPANCY_FLAGGED';
}
