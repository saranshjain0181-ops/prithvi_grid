import { createHash } from 'crypto';
import {
  ProductComplaint,
  QuarantineRecord,
  CAPA,
  RecallExecution,
  ComplaintSeverity,
} from '../db/models/ComplaintRecall';

export class ComplaintRecallService {
  private complaints: Map<string, ProductComplaint> = new Map();
  private quarantines: Map<string, QuarantineRecord> = new Map();
  private capas: Map<string, CAPA> = new Map();
  private recalls: Map<string, RecallExecution> = new Map();

  public registerComplaint(params: {
    lotNumber: string;
    sourceType: 'BUYER' | 'RESIDENT' | 'STAFF';
    severity: ComplaintSeverity;
    description: string;
    foreignContaminant?: 'PLASTIC' | 'GLASS' | 'METAL' | 'AMMONIA_ODOR';
    stockHeldKg?: number;
    relatedLots?: string[];
  }): { complaint: ProductComplaint; quarantine?: QuarantineRecord } {
    const complaintId = `COMP-${Date.now()}`;
    let quarantine: QuarantineRecord | undefined;

    // Immediate containment for safety issues or quality failures
    if (params.severity === 'SAFETY_ISSUE' || params.severity === 'QUALITY_FAILURE') {
      const qId = `QRN-${Date.now()}`;
      quarantine = {
        quarantineId: qId,
        lotNumber: params.lotNumber,
        relatedLotNumbers: params.relatedLots || [],
        quarantinedAt: new Date().toISOString(),
        status: 'ACTIVE',
        stockHeldKg: params.stockHeldKg || 1200,
      };
      this.quarantines.set(qId, quarantine);
    }

    const complaint: ProductComplaint = {
      complaintId,
      lotNumber: params.lotNumber,
      sourceType: params.sourceType,
      severity: params.severity,
      description: params.description,
      foreignContaminant: params.foreignContaminant,
      reportedAt: new Date().toISOString(),
      status: quarantine ? 'QUARANTINED' : 'TRIAGED',
      quarantineId: quarantine?.quarantineId,
    };

    this.complaints.set(complaintId, complaint);
    return { complaint, quarantine };
  }

  public createCAPA(params: {
    complaintId: string;
    rootCauseAnalysis: string;
    preventiveAction: string;
    assignedToUserId: string;
    dueDate: string;
  }): CAPA {
    const capaId = `CAPA-${Date.now()}`;
    const capa: CAPA = {
      capaId,
      complaintId: params.complaintId,
      rootCauseAnalysis: params.rootCauseAnalysis,
      preventiveAction: params.preventiveAction,
      assignedToUserId: params.assignedToUserId,
      dueDate: params.dueDate,
      isEffectivenessVerified: false,
      status: 'OPEN',
    };

    this.capas.set(capaId, capa);

    const comp = this.complaints.get(params.complaintId);
    if (comp) {
      comp.capaId = capaId;
      comp.status = 'UNDER_INVESTIGATION';
    }

    return capa;
  }

  public verifyCAPA(capaId: string): CAPA {
    const capa = this.capas.get(capaId);
    if (!capa) throw new Error(`CAPA ${capaId} not found`);

    capa.isEffectivenessVerified = true;
    capa.status = 'VERIFIED_CLOSED';

    const comp = this.complaints.get(capa.complaintId);
    if (comp) {
      comp.status = 'RESOLVED';
    }

    return capa;
  }

  public initiateRecall(params: {
    lotNumber: string;
    approverUserIds: [string, string]; // Dual independent approvers [LEGAL-REVIEW]
    totalKgSubjectToRecall: number;
  }): RecallExecution {
    if (params.approverUserIds[0] === params.approverUserIds[1]) {
      throw new Error('Mandatory dual independent approvers: approver 1 and 2 must be different individuals [LEGAL-REVIEW]');
    }

    const recallId = `RCL-${Date.now()}`;
    const approvalSealHash = createHash('sha256')
      .update(`RECALL:${params.lotNumber}:${params.approverUserIds[0]}:${params.approverUserIds[1]}:${Date.now()}`)
      .digest('hex');

    const recall: RecallExecution = {
      recallId,
      lotNumber: params.lotNumber,
      approverUserIds: params.approverUserIds,
      approvalSealHash,
      initiatedAt: new Date().toISOString(),
      totalKgSubjectToRecall: params.totalKgSubjectToRecall,
      returnedKg: 0,
      status: 'INITIATED',
    };

    this.recalls.set(recallId, recall);

    // Update related quarantines
    for (const q of this.quarantines.values()) {
      if (q.lotNumber === params.lotNumber) {
        q.status = 'RECALLED';
      }
    }

    return recall;
  }
}
