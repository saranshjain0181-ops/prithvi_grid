import {
  WorkforceCockpitView,
  CompetencyCoverage,
} from '../db/models/WorkforceCockpit';

export class WorkforceCockpitService {
  public computeWorkforceView(params: {
    tenantId: string;
    facilityId: string;
    totalHeadcount: number;
    shiftCoverageGapsHours: number;
    competenciesData: {
      competency: CompetencyCoverage['competency'];
      certifiedCount: number;
      expiringIn30Days: number;
    }[];
    heatRestAdherencePct: number;
    huddleParticipationPct: number;
    ideasSubmittedCount: number;
  }): WorkforceCockpitView {
    const isGroupPrivacyProtected = params.totalHeadcount >= 5;

    const competencies: CompetencyCoverage[] = params.competenciesData.map((c) => ({
      competency: c.competency,
      certifiedWorkersCount: c.certifiedCount,
      expiringIn30DaysCount: c.expiringIn30Days,
      isSinglePointOfFailure: c.certifiedCount <= 1,
    }));

    const resilienceRiskSummary: string[] = [];
    const spof = competencies.filter((c) => c.isSinglePointOfFailure);
    if (spof.length > 0) {
      resilienceRiskSummary.push(
        `Critical single point of failure in: ${spof.map((s) => s.competency).join(', ')}. Schedule cross-training immediately.`
      );
    }
    if (params.shiftCoverageGapsHours > 10) {
      resilienceRiskSummary.push(
        `Elevated shift coverage gap: ${params.shiftCoverageGapsHours}h shortfall this week.`
      );
    }
    if (params.heatRestAdherencePct < 85) {
      resilienceRiskSummary.push('Heat-rest break compliance below 85% safety threshold.');
    }

    return {
      tenantId: params.tenantId,
      facilityId: params.facilityId,
      asOfDate: new Date().toISOString(),
      totalWorkforceHeadcount: params.totalHeadcount,
      isGroupPrivacyProtected,
      shiftCoverageGapsHours: params.shiftCoverageGapsHours,
      competencies,
      heatRestAdherencePct: params.heatRestAdherencePct,
      huddleParticipationPct: params.huddleParticipationPct,
      ideasSubmittedLast30Days: params.ideasSubmittedCount,
      resilienceRiskSummary,
    };
  }
}
