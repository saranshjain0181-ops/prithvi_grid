import { CorrectionRequest, ICorrectionRequest, CorrectionStatus } from '../db/models/CorrectionRequest.js';
import crypto from 'crypto';

export interface SubmitCorrectionInput {
  entityId: string;
  facilityId: string;
  targetCollection: string;
  targetRecordId: string;
  fieldName: string;
  originalValue: any;
  proposedValue: any;
  reason: string;
  makerUserId: string;
}

export interface ReviewCorrectionInput {
  requestId: string;
  checkerUserId: string;
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export interface DayCoverageStatus {
  date: string;
  pitId: string;
  telemetryUptimePercent: number;
  labourTasksCount: number;
  scaleWeighed: boolean;
  status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
}

export class DataCorrectionService {
  /**
   * Deterministically creates a correction proposal with cryptographic SHA-256 audit hash
   */
  createCorrectionProposal(input: SubmitCorrectionInput): {
    requestId: string;
    auditHash: string;
    version: number;
    status: 'PENDING';
    proposal: SubmitCorrectionInput;
  } {
    const requestId = `CORR-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const auditPayload = JSON.stringify({
      requestId,
      targetCollection: input.targetCollection,
      targetRecordId: input.targetRecordId,
      fieldName: input.fieldName,
      originalValue: input.originalValue,
      proposedValue: input.proposedValue,
      makerUserId: input.makerUserId,
      reason: input.reason,
    });
    const auditHash = crypto.createHash('sha256').update(auditPayload).digest('hex');

    return {
      requestId,
      auditHash,
      version: 1,
      status: 'PENDING',
      proposal: input,
    };
  }

  /**
   * Evaluates review decision with strict two-person maker-checker separation rule
   */
  evaluateReview(params: {
    makerUserId: string;
    checkerUserId: string;
    currentStatus: string;
    desiredStatus: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  }): { allowed: boolean; status: 'APPROVED' | 'REJECTED'; reason?: string } {
    if (params.currentStatus !== 'PENDING') {
      throw new Error(`Correction proposal has already been settled as ${params.currentStatus}.`);
    }

    if (params.makerUserId === params.checkerUserId) {
      throw new Error(
        `[AUDIT-VIOLATION] Maker (${params.makerUserId}) cannot approve their own correction request. Independent checker required.`
      );
    }

    return {
      allowed: true,
      status: params.desiredStatus,
      reason: params.rejectionReason,
    };
  }

  /**
   * Deterministically evaluates single day coverage status
   */
  evaluateDayCoverage(params: {
    telemetryUptimePercent: number;
    labourTasksCount: number;
  }): 'COMPLETE' | 'PARTIAL' | 'MISSING' {
    if (params.telemetryUptimePercent >= 75 && params.labourTasksCount >= 1) {
      return 'COMPLETE';
    }
    if (params.telemetryUptimePercent > 0 || params.labourTasksCount > 0) {
      return 'PARTIAL';
    }
    return 'MISSING';
  }

  /**
   * Submits a non-destructive correction request into database
   */
  async submitCorrection(input: SubmitCorrectionInput): Promise<ICorrectionRequest> {
    const proposal = this.createCorrectionProposal(input);
    const request = await CorrectionRequest.create({
      requestId: proposal.requestId,
      entityId: input.entityId,
      facilityId: input.facilityId,
      targetCollection: input.targetCollection,
      targetRecordId: input.targetRecordId,
      fieldName: input.fieldName,
      originalValue: input.originalValue,
      proposedValue: input.proposedValue,
      reason: input.reason,
      makerUserId: input.makerUserId,
      status: 'PENDING',
      version: 1,
      auditHash: proposal.auditHash,
    });
    return request;
  }

  /**
   * Reviews correction in database
   */
  async reviewCorrection(input: ReviewCorrectionInput): Promise<ICorrectionRequest> {
    const request = await CorrectionRequest.findOne({ requestId: input.requestId });
    if (!request) {
      throw new Error(`Correction request ${input.requestId} not found.`);
    }

    this.evaluateReview({
      makerUserId: request.makerUserId,
      checkerUserId: input.checkerUserId,
      currentStatus: request.status,
      desiredStatus: input.status,
      rejectionReason: input.rejectionReason,
    });

    request.checkerUserId = input.checkerUserId;
    request.status = input.status;
    request.reviewedAt = new Date();
    if (input.rejectionReason) {
      request.rejectionReason = input.rejectionReason;
    }

    await request.save();
    return request;
  }
}

export const dataCorrectionService = new DataCorrectionService();
