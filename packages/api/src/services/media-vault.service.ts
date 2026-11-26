import { createHash } from 'crypto';
import {
  MediaAsset,
  MediaClassification,
  ConsentRecord,
  RedactionJob,
  LegalHold,
  MediaPolicy,
} from '../db/models/MediaVault';

export class MediaVaultService {
  private assets: Map<string, MediaAsset> = new Map();
  private consents: Map<string, ConsentRecord> = new Map();
  private legalHolds: Map<string, LegalHold> = new Map();
  private policies: Map<MediaClassification, MediaPolicy> = new Map();

  constructor() {
    this.seedDefaultPolicies();
  }

  private seedDefaultPolicies(): void {
    this.policies.set('EVIDENCE', {
      policyId: 'POL-EVIDENCE',
      classification: 'EVIDENCE',
      defaultRetentionDays: 365 * 3, // 3 years regulatory hold
      requireAutoRedaction: false,
      storageTierTransitionDays: { warmAfterDays: 90, coldAfterDays: 365 },
    });
    this.policies.set('OPERATIONAL', {
      policyId: 'POL-OPERATIONAL',
      classification: 'OPERATIONAL',
      defaultRetentionDays: 90, // 90 days default
      requireAutoRedaction: false,
      storageTierTransitionDays: { warmAfterDays: 30, coldAfterDays: 60 },
    });
    this.policies.set('PERSONAL', {
      policyId: 'POL-PERSONAL',
      classification: 'PERSONAL',
      defaultRetentionDays: 90,
      requireAutoRedaction: true,
      storageTierTransitionDays: { warmAfterDays: 30, coldAfterDays: 60 },
    });
    this.policies.set('PUBLIC', {
      policyId: 'POL-PUBLIC',
      classification: 'PUBLIC',
      defaultRetentionDays: 365 * 5,
      requireAutoRedaction: true,
      storageTierTransitionDays: { warmAfterDays: 180, coldAfterDays: 365 },
    });
  }

  public registerConsent(consent: ConsentRecord): void {
    this.consents.set(consent.consentId, consent);
  }

  public uploadMedia(params: {
    sourceFeature: string;
    linkedEntityId: string;
    linkedEntityType: string;
    rawBufferOrContent: string;
    classification: MediaClassification;
    mimeType: string;
    tags?: string[];
    consentRecordId?: string;
  }): { asset: MediaAsset; redactionRequired: boolean } {
    const assetId = `MED-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fileHash = createHash('sha256').update(params.rawBufferOrContent).digest('hex');

    const policy = this.policies.get(params.classification);
    const retentionDays = policy ? policy.defaultRetentionDays : 90;
    const retentionExpiresAt = new Date(Date.now() + retentionDays * 86400 * 1000).toISOString();

    const isEvidence = params.classification === 'EVIDENCE';
    const sealHash = isEvidence
      ? createHash('sha256').update(`SEAL:${assetId}:${fileHash}:${Date.now()}`).digest('hex')
      : undefined;

    const redactionRequired =
      params.classification === 'PERSONAL' || (policy?.requireAutoRedaction ?? false);

    const asset: MediaAsset = {
      assetId,
      fileHash,
      perceptualHash: `pHash-${fileHash.substring(0, 16)}`,
      sourceFeature: params.sourceFeature,
      linkedEntityId: params.linkedEntityId,
      linkedEntityType: params.linkedEntityType,
      capturedAt: new Date().toISOString(),
      sizeBytes: Buffer.byteLength(params.rawBufferOrContent),
      classification: params.classification,
      storageTier: 'HOT',
      retentionExpiresAt,
      isSealed: isEvidence,
      sealHash,
      isRedacted: false,
      mimeType: params.mimeType,
      legalHoldActive: false,
      tags: params.tags || [],
      consentRecordId: params.consentRecordId,
    };

    this.assets.set(assetId, asset);
    return { asset, redactionRequired };
  }

  public performRedaction(params: {
    assetId: string;
    detectedFacesCount: number;
    detectedTextCount?: number;
    requiresHumanReview?: boolean;
  }): RedactionJob {
    const asset = this.assets.get(params.assetId);
    if (!asset) {
      throw new Error(`Media asset ${params.assetId} not found`);
    }

    const job: RedactionJob = {
      jobId: `RED-${Date.now()}`,
      assetId: params.assetId,
      detectedFacesCount: params.detectedFacesCount,
      detectedTextCount: params.detectedTextCount || 0,
      confidence: 0.94,
      requiresHumanReview: params.requiresHumanReview || false,
      status: params.requiresHumanReview ? 'HUMAN_REVIEW_REQUIRED' : 'AUTO_BLURRED',
      completedAt: params.requiresHumanReview ? undefined : new Date().toISOString(),
    };

    if (!params.requiresHumanReview) {
      asset.isRedacted = true;
      asset.redactedAssetRef = `redacted_${asset.assetId}.jpg`;
      asset.originalAssetRef = `vault_secure_orig_${asset.assetId}.dat`;
    }

    return job;
  }

  public applyLegalHold(params: {
    holdId: string;
    caseRef: string;
    appliedBy: string;
    reason: string;
    assetIds: string[];
  }): LegalHold {
    const hold: LegalHold = {
      holdId: params.holdId,
      caseRef: params.caseRef,
      appliedBy: params.appliedBy,
      appliedAt: new Date().toISOString(),
      reason: params.reason,
      assetIds: params.assetIds,
      isActive: true,
    };

    for (const id of params.assetIds) {
      const asset = this.assets.get(id);
      if (asset) {
        asset.legalHoldActive = true;
      }
    }

    this.legalHolds.set(params.holdId, hold);
    return hold;
  }

  public purgeExpiredAssets(currentTimeMs = Date.now()): { purgedAssetIds: string[]; heldCount: number } {
    const purged: string[] = [];
    let held = 0;

    for (const [id, asset] of this.assets.entries()) {
      const isPastRetention = new Date(asset.retentionExpiresAt).getTime() <= currentTimeMs;
      if (isPastRetention) {
        if (asset.legalHoldActive) {
          held++;
        } else {
          purged.push(id);
          this.assets.delete(id);
        }
      }
    }

    return { purgedAssetIds: purged, heldCount: held };
  }

  public fulfillDataSubjectDeletion(userId: string): {
    anonymizedCount: number;
    deletedCount: number;
    pseudonymizedSeals: number;
  } {
    let anonymized = 0;
    let deleted = 0;
    let sealedPreserved = 0;

    for (const asset of this.assets.values()) {
      if (asset.tags.includes(`user:${userId}`) || asset.consentRecordId === `consent-${userId}`) {
        if (asset.isSealed) {
          // Pseudonymize to preserve Merkle/SHA seal integrity
          asset.tags = asset.tags.filter((t) => !t.includes(userId));
          asset.tags.push('subject:DEIDENTIFIED_GDPR_ACT');
          sealedPreserved++;
        } else if (!asset.legalHoldActive) {
          this.assets.delete(asset.assetId);
          deleted++;
        } else {
          anonymized++;
        }
      }
    }

    return { anonymizedCount: anonymized, deletedCount: deleted, pseudonymizedSeals: sealedPreserved };
  }

  public getAsset(assetId: string): MediaAsset | undefined {
    return this.assets.get(assetId);
  }
}
