/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 14
 * Product Complaint, Recall and Corrective Action Workflow
 * Complaint triage, rapid quarantine, retained sample retesting, and dual-approver recall governance.
 * [LEGAL-REVIEW] Consumer liability, recall execution, and statutory authority notifications.
 */

export type ComplaintSeverity = 'SAFETY_ISSUE' | 'QUALITY_FAILURE' | 'NUISANCE';
export type QuarantineStatus = 'ACTIVE' | 'RELEASED' | 'RECALLED';

export interface ProductComplaint {
  complaintId: string;
  lotNumber: string;
  sourceType: 'BUYER' | 'RESIDENT' | 'STAFF';
  severity: ComplaintSeverity;
  description: string;
  foreignContaminant?: 'PLASTIC' | 'GLASS' | 'METAL' | 'AMMONIA_ODOR';
  reportedAt: string;
  status: 'TRIAGED' | 'QUARANTINED' | 'UNDER_INVESTIGATION' | 'RESOLVED';
  quarantineId?: string;
  capaId?: string;
}

export interface QuarantineRecord {
  quarantineId: string;
  lotNumber: string;
  relatedLotNumbers: string[];
  quarantinedAt: string;
  status: QuarantineStatus;
  stockHeldKg: number;
}

export interface CAPA {
  capaId: string;
  complaintId: string;
  rootCauseAnalysis: string;
  preventiveAction: string;
  assignedToUserId: string;
  dueDate: string;
  isEffectivenessVerified: boolean;
  status: 'OPEN' | 'IMPLEMENTED' | 'VERIFIED_CLOSED';
}

export interface RecallExecution {
  recallId: string;
  lotNumber: string;
  approverUserIds: [string, string]; // Mandatory dual independent approvers [LEGAL-REVIEW]
  approvalSealHash: string;
  initiatedAt: string;
  totalKgSubjectToRecall: number;
  returnedKg: number;
  status: 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED';
}
