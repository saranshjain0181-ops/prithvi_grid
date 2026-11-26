/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 2
 * Media Vault with Retention, Consent and Redaction
 * Unified media governance for photos, voice notes, time-lapse, and scans.
 * [LEGAL-REVIEW] Data privacy, consent lifecycle, and automated face/voice redaction.
 */

export type MediaClassification = 'EVIDENCE' | 'OPERATIONAL' | 'PERSONAL' | 'PUBLIC';
export type StorageTier = 'HOT' | 'WARM' | 'COLD';
export type RedactionStatus = 'NOT_REQUIRED' | 'PENDING' | 'AUTO_BLURRED' | 'HUMAN_REVIEW_REQUIRED' | 'CONFIRMED';

export interface MediaAsset {
  assetId: string;
  fileHash: string;
  perceptualHash?: string;
  sourceFeature: string;
  linkedEntityId: string;
  linkedEntityType: string;
  capturedAt: string;
  sizeBytes: number;
  classification: MediaClassification;
  storageTier: StorageTier;
  retentionExpiresAt: string;
  isSealed: boolean;
  sealHash?: string;
  isRedacted: boolean;
  redactedAssetRef?: string;
  originalAssetRef?: string;
  mimeType: string;
  legalHoldActive: boolean;
  tags: string[];
  consentRecordId?: string;
}

export interface ConsentRecord {
  consentId: string;
  userId: string;
  purpose: 'TRAINING_VOICE' | 'PUBLIC_DISPLAY' | 'INCIDENT_DOCUMENTATION';
  grantedAt: string;
  expiresAt: string;
  isRevoked: boolean;
}

export interface RedactionJob {
  jobId: string;
  assetId: string;
  detectedFacesCount: number;
  detectedTextCount: number;
  confidence: number;
  requiresHumanReview: boolean;
  status: RedactionStatus;
  completedAt?: string;
}

export interface LegalHold {
  holdId: string;
  caseRef: string;
  appliedBy: string;
  appliedAt: string;
  reason: string;
  assetIds: string[];
  isActive: boolean;
}

export interface MediaPolicy {
  policyId: string;
  classification: MediaClassification;
  defaultRetentionDays: number;
  requireAutoRedaction: boolean;
  storageTierTransitionDays: {
    warmAfterDays: number;
    coldAfterDays: number;
  };
}
