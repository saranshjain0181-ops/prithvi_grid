/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 13
 * Field Proof, Compost Performance Trials with Buyers
 * Standardised trial protocols, buyer garden trials, and verified proof cards.
 * [EXPERT-REVIEW] Pre-registered success rules and [LEGAL-REVIEW] public proof card claims.
 */

export interface TrialProtocol {
  protocolId: string;
  name: string;
  testType: 'POT_GERMINATION' | 'FIELD_BED_COMPARISON' | 'NURSERY_POTTING_MIX';
  controlMedium: string;
  testMixRatiosPct: number[]; // e.g. [10, 20, 30]
  evaluationDays: number[]; // e.g. [0, 7, 14, 28]
  preRegisteredSuccessRule: string;
}

export interface FieldTrial {
  trialId: string;
  protocolId: string;
  lotNumber: string;
  participantType: 'INTERNAL_FACILITY' | 'EXTERNAL_BUYER';
  participantName: string;
  startedAt: string;
  completedAt?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  isSuccessRuleMet?: boolean;
}

export interface TrialObservation {
  observationId: string;
  trialId: string;
  dayNumber: number;
  germinationRatePct?: number;
  averagePlantHeightCm?: number;
  leafColorRating?: 'PALE_YELLOW' | 'LIGHT_GREEN' | 'LUSH_DARK_GREEN';
  photoMediaAssetId?: string;
  recordedAt: string;
}

export interface ProofCard {
  cardId: string;
  lotNumber: string;
  totalTrialsConducted: number;
  successfulTrialsCount: number;
  successRatePct: number;
  testedRatios: string;
  headlineSummary: string;
  conditionsStatement: string;
  isAgronomistApproved: boolean;
  claimsRegisterReference: string;
}
