import {
  FailureReport,
  DesignChangeRequest,
  ReliabilityMetrics,
  FailureCategory,
} from '../db/models/FracasReliability';

export class FracasReliabilityService {
  private reports: FailureReport[] = [];
  private dcrs: Map<string, DesignChangeRequest> = new Map();

  public logFailure(params: {
    nodeId: string;
    hardwareRevision: string;
    componentLot: string;
    firmwareVersion: string;
    failureCategory: FailureCategory;
    primaryFailureMode: 'PH_DRIFT' | 'MOISTURE_CORROSION' | 'SUPERCAP_DEGRADATION' | 'MODEM_FAULT' | 'ENCLOSURE_LEAK';
    symptomsDescription: string;
    fieldServiceCostInr?: number;
  }): FailureReport {
    const reportId = `FAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const report: FailureReport = {
      reportId,
      nodeId: params.nodeId,
      hardwareRevision: params.hardwareRevision,
      componentLot: params.componentLot,
      firmwareVersion: params.firmwareVersion,
      failureCategory: params.failureCategory,
      primaryFailureMode: params.primaryFailureMode,
      symptomsDescription: params.symptomsDescription,
      reportedAt: new Date().toISOString(),
      fieldServiceCostInr: params.fieldServiceCostInr || 450,
    };

    this.reports.push(report);
    return report;
  }

  public createDesignChangeRequest(params: {
    title: string;
    affectedFailureMode: string;
    targetHardwareRevision: string;
    supplierActionRequired?: string;
    approvedByAuthorityMatrix: boolean;
  }): DesignChangeRequest {
    const dcrId = `DCR-${Date.now()}`;
    const dcr: DesignChangeRequest = {
      dcrId,
      title: params.title,
      affectedFailureMode: params.affectedFailureMode,
      targetHardwareRevision: params.targetHardwareRevision,
      supplierActionRequired: params.supplierActionRequired,
      status: params.approvedByAuthorityMatrix ? 'APPROVED_FOR_PILOT' : 'PROPOSED',
      approvedByAuthorityMatrix: params.approvedByAuthorityMatrix,
      createdAt: new Date().toISOString(),
    };

    this.dcrs.set(dcrId, dcr);
    return dcr;
  }

  public computeReliabilityMetrics(totalNodesInFleet = 100): ReliabilityMetrics {
    const totalFailures = this.reports.length;
    const totalCost = this.reports.reduce((acc, r) => acc + r.fieldServiceCostInr, 0);

    // Group by mode
    const modeCounts: Record<string, number> = {};
    for (const r of this.reports) {
      modeCounts[r.primaryFailureMode] = (modeCounts[r.primaryFailureMode] || 0) + 1;
    }

    const pareto = Object.entries(modeCounts)
      .map(([mode, count]) => ({
        mode,
        count,
        percentage: Number(((count / (totalFailures || 1)) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    const mtbfOperatingDays =
      totalFailures > 0 ? Math.round((totalNodesInFleet * 180) / totalFailures) : 365;

    return {
      totalFailuresLogged: totalFailures,
      mtbfOperatingDays,
      warrantyCostPerNodeInr: Number((totalCost / Math.max(1, totalNodesInFleet)).toFixed(2)),
      failurePareto: pareto,
    };
  }
}
