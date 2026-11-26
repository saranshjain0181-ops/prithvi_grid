import { Types } from 'mongoose';
import { DecisionInboxItem, IDecisionInboxItem, DecisionType } from '../db/models/DecisionInboxItem';

export interface CreateDecisionParams {
  tenantId: string | Types.ObjectId;
  facilityId: string | Types.ObjectId;
  decisionType: DecisionType;
  title: string;
  summaryReason: string;
  recommendedOption: string;
  alternativeOptions?: string[];
  estimatedCostInr?: number;
  deadlineHoursFromNow?: number;
  consequenceOfInaction: string;
  evidenceStrengthTier?: 'STRONG' | 'MODERATE' | 'WEAK';
}

export class DecisionInboxService {
  /**
   * Registers a structured operational decision item in the manager's inbox (Feature 17).
   */
  public async createDecisionItem(params: CreateDecisionParams): Promise<IDecisionInboxItem> {
    const tenantObjId = new Types.ObjectId(params.tenantId.toString());
    const facilityObjId = new Types.ObjectId(params.facilityId.toString());
    const deadlineHours = params.deadlineHoursFromNow || 48;
    const deadline = new Date(Date.now() + deadlineHours * 3600 * 1000);

    const item = await DecisionInboxItem.create({
      tenantId: tenantObjId,
      facilityId: facilityObjId,
      decisionType: params.decisionType,
      title: params.title,
      summaryReason: params.summaryReason,
      recommendedOption: params.recommendedOption,
      alternativeOptions: params.alternativeOptions || ['Defer by 7 days', 'Reject recommendation'],
      estimatedCostInr: params.estimatedCostInr,
      deadline,
      consequenceOfInaction: params.consequenceOfInaction,
      evidenceStrengthTier: params.evidenceStrengthTier || 'STRONG',
      status: 'PENDING',
    });

    return item;
  }

  /**
   * Executes one-tap manager decision approval or rejection idempotently.
   */
  public async resolveDecision(params: {
    decisionId: string | Types.ObjectId;
    userId: string | Types.ObjectId;
    approved: boolean;
    remark?: string;
  }): Promise<IDecisionInboxItem> {
    const item = await DecisionInboxItem.findById(params.decisionId);
    if (!item) {
      throw new Error(`Decision item not found: ${params.decisionId}`);
    }

    if (item.status !== 'PENDING') {
      return item; // Idempotent return if already resolved
    }

    item.status = params.approved ? 'APPROVED' : 'REJECTED';
    item.resolvedAt = new Date();
    item.resolvedBy = new Types.ObjectId(params.userId.toString());
    item.resolutionRemark = params.remark || (params.approved ? 'Approved by facility manager' : 'Rejected by manager');

    await item.save();
    return item;
  }
}

export const decisionInboxService = new DecisionInboxService();
