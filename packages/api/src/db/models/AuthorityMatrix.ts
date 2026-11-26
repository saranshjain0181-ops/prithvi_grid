/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 1
 * Authority Matrix and Delegation of Approvals
 * Mandatory shared approval engine enforcing segregation-of-duties and cryptographic sign-off.
 */

export type ApprovalRiskClass = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SignOffMethod = 'TAP' | 'PIN' | 'OTP' | 'DUAL_INDEPENDENT';
export type ApprovalStatus = 'PENDING' | 'GRANTED' | 'REJECTED' | 'EXPIRED' | 'ESCALATED';

export interface ApprovalType {
  code: string;
  name: string;
  riskClass: ApprovalRiskClass;
  measureUnit: 'INR' | 'KG' | 'SEVERITY' | 'PITS_COUNT' | 'DISPOSITION';
  defaultLimit: number;
  evidenceRequired: string[];
  autoApproveLowRisk?: boolean;
}

export interface AuthorityRule {
  ruleId: string;
  role: string;
  entityId: string;
  approvalTypeCode: string;
  limitValue: number;
  scope: 'FACILITY' | 'TENANT' | 'GLOBAL';
  enforceSegregationOfDuties: boolean;
  version: number;
}

export interface Delegation {
  delegationId: string;
  delegatorUserId: string;
  delegateUserId: string;
  approvalTypeCodes: string[];
  maxLimitValue: number;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  auditProof: string;
}

export interface SignOffRecord {
  signOffId: string;
  approverUserId: string;
  actingForUserId?: string;
  method: SignOffMethod;
  timestamp: string;
  sealHash: string;
}

export interface ApprovalRequest {
  requestId: string;
  approvalTypeCode: string;
  subjectEntityId: string;
  entityType: string;
  amountOrSeverity: number;
  evidenceRefs: string[];
  requesterUserId: string;
  status: ApprovalStatus;
  requiredApproversCount: number;
  signOffs: SignOffRecord[];
  createdAt: string;
  expiryAt: string;
  escalatedToUserId?: string;
  breakGlassUsed?: boolean;
  breakGlassReason?: string;
  summaryExplanation?: string;
}

export interface BreakGlassUse {
  breakGlassId: string;
  actorUserId: string;
  action: string;
  mandatoryReason: string;
  requestId?: string;
  reviewDueAt: string;
  isReviewed: boolean;
  timestamp: string;
}
