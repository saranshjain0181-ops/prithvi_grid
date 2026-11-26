import { createHash } from 'crypto';
import {
  ApprovalType,
  AuthorityRule,
  Delegation,
  ApprovalRequest,
  SignOffRecord,
  BreakGlassUse,
  ApprovalRiskClass,
} from '../db/models/AuthorityMatrix';

export class AuthorityMatrixService {
  private approvalTypes: Map<string, ApprovalType> = new Map();
  private rules: Map<string, AuthorityRule> = new Map();
  private delegations: Map<string, Delegation> = new Map();
  private requests: Map<string, ApprovalRequest> = new Map();
  private breakGlasses: BreakGlassUse[] = [];

  constructor() {
    this.seedDefaultTypes();
  }

  private seedDefaultTypes(): void {
    const defaults: ApprovalType[] = [
      {
        code: 'PURCHASE_ORDER',
        name: 'Procurement / Purchase Order',
        riskClass: 'HIGH',
        measureUnit: 'INR',
        defaultLimit: 25000,
        evidenceRequired: ['QUOTATION', 'BUDGET_CODE'],
      },
      {
        code: 'BATCH_RECALL',
        name: 'Product Batch Recall',
        riskClass: 'CRITICAL',
        measureUnit: 'DISPOSITION',
        defaultLimit: 1,
        evidenceRequired: ['LAB_REPORT', 'CUSTOMER_COMPLAINT_REF'],
      },
      {
        code: 'CORRECTION_OVERRIDE',
        name: 'Labour or Weight Correction',
        riskClass: 'MEDIUM',
        measureUnit: 'KG',
        defaultLimit: 500,
        evidenceRequired: ['SUPERVISOR_NOTE', 'WEIGHING_PHOTO'],
      },
      {
        code: 'LOW_RISK_TASK',
        name: 'Minor Task Reschedule',
        riskClass: 'LOW',
        measureUnit: 'PITS_COUNT',
        defaultLimit: 1,
        evidenceRequired: [],
        autoApproveLowRisk: true,
      },
      {
        code: 'AUTOMATION_MODE_CHANGE',
        name: 'Actuator Mode Transition',
        riskClass: 'HIGH',
        measureUnit: 'SEVERITY',
        defaultLimit: 1,
        evidenceRequired: ['ELECTRICAL_SAFETY_CERTIFICATE'],
      },
    ];

    defaults.forEach((t) => this.approvalTypes.set(t.code, t));
  }

  public registerRule(rule: AuthorityRule): void {
    this.rules.set(rule.ruleId, rule);
  }

  public registerDelegation(delegation: Delegation): void {
    this.delegations.set(delegation.delegationId, delegation);
  }

  public createApprovalRequest(params: {
    approvalTypeCode: string;
    subjectEntityId: string;
    entityType: string;
    amountOrSeverity: number;
    evidenceRefs: string[];
    requesterUserId: string;
    summaryExplanation?: string;
  }): ApprovalRequest {
    const type = this.approvalTypes.get(params.approvalTypeCode);
    if (!type) {
      throw new Error(`Unknown approval type code: ${params.approvalTypeCode}`);
    }

    const requestId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const requiredApproversCount = type.riskClass === 'CRITICAL' ? 2 : 1;

    // Check if auto-approve low-risk
    const isAutoApproved =
      type.autoApproveLowRisk &&
      type.riskClass === 'LOW' &&
      params.amountOrSeverity <= type.defaultLimit;

    const req: ApprovalRequest = {
      requestId,
      approvalTypeCode: params.approvalTypeCode,
      subjectEntityId: params.subjectEntityId,
      entityType: params.entityType,
      amountOrSeverity: params.amountOrSeverity,
      evidenceRefs: params.evidenceRefs,
      requesterUserId: params.requesterUserId,
      status: isAutoApproved ? 'GRANTED' : 'PENDING',
      requiredApproversCount,
      signOffs: [],
      createdAt: new Date().toISOString(),
      expiryAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      summaryExplanation: params.summaryExplanation,
    };

    if (isAutoApproved) {
      const autoSeal = createHash('sha256')
        .update(`AUTO-${requestId}-${params.requesterUserId}`)
        .digest('hex');
      req.signOffs.push({
        signOffId: `SIG-AUTO-${Date.now()}`,
        approverUserId: 'SYSTEM_POLICY_ENGINE',
        method: 'TAP',
        timestamp: new Date().toISOString(),
        sealHash: autoSeal,
      });
    }

    this.requests.set(requestId, req);
    return req;
  }

  public signOff(params: {
    requestId: string;
    approverUserId: string;
    method: 'TAP' | 'PIN' | 'OTP' | 'DUAL_INDEPENDENT';
    verificationSecret?: string;
    actingForUserId?: string;
  }): { success: boolean; request: ApprovalRequest; message: string } {
    const req = this.requests.get(params.requestId);
    if (!req) {
      throw new Error(`Approval request not found: ${params.requestId}`);
    }

    if (req.status !== 'PENDING') {
      return { success: false, request: req, message: `Request is already ${req.status}` };
    }

    // Segregation of duties: requester cannot approve own request
    if (req.requesterUserId === params.approverUserId) {
      throw new Error(
        `Segregation of duties violation: requester ${params.approverUserId} cannot self-approve`
      );
    }

    // Check delegation if acting for someone
    if (params.actingForUserId) {
      const delegation = Array.from(this.delegations.values()).find(
        (d) =>
          d.delegatorUserId === params.actingForUserId &&
          d.delegateUserId === params.approverUserId &&
          d.status === 'ACTIVE' &&
          d.approvalTypeCodes.includes(req.approvalTypeCode) &&
          req.amountOrSeverity <= d.maxLimitValue
      );
      if (!delegation) {
        throw new Error(
          `Unauthorized delegation: ${params.approverUserId} cannot act for ${params.actingForUserId} on ${req.approvalTypeCode}`
        );
      }
    }

    // Check duplicate sign-off by same approver
    if (req.signOffs.some((s) => s.approverUserId === params.approverUserId)) {
      throw new Error(`Approver ${params.approverUserId} has already signed off`);
    }

    // Generate cryptographic evidence seal
    const sealData = `${req.requestId}:${params.approverUserId}:${params.method}:${new Date().toISOString()}`;
    const sealHash = createHash('sha256').update(sealData).digest('hex');

    const signOff: SignOffRecord = {
      signOffId: `SIG-${Date.now()}`,
      approverUserId: params.approverUserId,
      actingForUserId: params.actingForUserId,
      method: params.method,
      timestamp: new Date().toISOString(),
      sealHash,
    };

    req.signOffs.push(signOff);

    if (req.signOffs.length >= req.requiredApproversCount) {
      req.status = 'GRANTED';
    }

    return {
      success: true,
      request: req,
      message:
        req.status === 'GRANTED'
          ? 'Approval fully granted'
          : `Signed off (${req.signOffs.length}/${req.requiredApproversCount})`,
    };
  }

  public breakGlass(params: {
    requestId: string;
    actorUserId: string;
    action: string;
    mandatoryReason: string;
  }): ApprovalRequest {
    const req = this.requests.get(params.requestId);
    if (!req) {
      throw new Error(`Request ${params.requestId} not found`);
    }

    if (!params.mandatoryReason || params.mandatoryReason.trim().length < 10) {
      throw new Error('Break-glass requires a mandatory justification of at least 10 characters');
    }

    const breakGlassRecord: BreakGlassUse = {
      breakGlassId: `BG-${Date.now()}`,
      actorUserId: params.actorUserId,
      action: params.action,
      mandatoryReason: params.mandatoryReason,
      requestId: params.requestId,
      reviewDueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      isReviewed: false,
      timestamp: new Date().toISOString(),
    };

    this.breakGlasses.push(breakGlassRecord);

    req.status = 'GRANTED';
    req.breakGlassUsed = true;
    req.breakGlassReason = params.mandatoryReason;

    return req;
  }

  public getBottleneckSummary(tenantId: string) {
    const all = Array.from(this.requests.values());
    const pending = all.filter((r) => r.status === 'PENDING');
    const granted = all.filter((r) => r.status === 'GRANTED');

    return {
      totalRequests: all.length,
      pendingCount: pending.length,
      grantedCount: granted.length,
      breakGlassCount: this.breakGlasses.length,
      activeDelegationsCount: Array.from(this.delegations.values()).filter(
        (d) => d.status === 'ACTIVE'
      ).length,
      pendingAgingHoursAverage:
        pending.length > 0
          ? pending.reduce(
              (acc, r) => acc + (Date.now() - new Date(r.createdAt).getTime()) / 3600000,
              0
            ) / pending.length
          : 0,
    };
  }

  public getRequest(requestId: string): ApprovalRequest | undefined {
    return this.requests.get(requestId);
  }
}
