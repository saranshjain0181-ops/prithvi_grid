import {
  GrowthExpansionView,
  ExpansionSignal,
  CityLaunchReadiness,
} from '../db/models/GrowthExpansion';

export class GrowthExpansionService {
  public computeGrowthView(params: {
    activeNodesCount: number;
    pipelineDealsCount: number;
    conversionRatePct: number;
    activePilotsCount: number;
    pilotsAtRiskCount: number;
    capacityExhaustionTenants: { tenantId: string; facilityId: string; runwayWeeks: number }[];
    citiesData: {
      cityName: string;
      catalogueMapped: boolean;
      labPartnerOnboarded: boolean;
      installerTrained: boolean;
      anchorClients: number;
    }[];
    grossMarginPerNodeInr: number;
  }): GrowthExpansionView {
    const expansionSignals: ExpansionSignal[] = params.capacityExhaustionTenants.map((t) => ({
      signalId: `EXP-SIG-${t.tenantId}`,
      tenantId: t.tenantId,
      facilityId: t.facilityId,
      signalType: 'CAPACITY_EXHAUSTION_SOON',
      evidenceSummary: `Pit capacity runway is only ${t.runwayWeeks} weeks under current intake growth.`,
      suggestedAction: 'Propose expansion: 2 additional Smart Spear nodes + 1 pre-aeration bay',
      raisedAt: new Date().toISOString(),
    }));

    const citiesReadiness: CityLaunchReadiness[] = params.citiesData.map((c) => {
      let completedChecklist = 0;
      if (c.catalogueMapped) completedChecklist += 25;
      if (c.labPartnerOnboarded) completedChecklist += 25;
      if (c.installerTrained) completedChecklist += 25;
      if (c.anchorClients >= 2) completedChecklist += 25;
      else if (c.anchorClients === 1) completedChecklist += 12;

      const launchStatus =
        completedChecklist >= 90
          ? 'READY_TO_LAUNCH'
          : completedChecklist >= 50
          ? 'PREPARATION'
          : 'SCOPING';

      return {
        cityName: c.cityName,
        regulatoryCatalogueMapped: c.catalogueMapped,
        localLabPartnerOnboarded: c.labPartnerOnboarded,
        installerFieldPartnerTrained: c.installerTrained,
        anchorClientsSignedCount: c.anchorClients,
        overallReadinessPct: completedChecklist,
        launchStatus,
      };
    });

    return {
      asOfDate: new Date().toISOString(),
      activeNodesFleetCount: params.activeNodesCount,
      pipelineDealsCount: params.pipelineDealsCount,
      conversionRatePct: params.conversionRatePct,
      activePilotsCount: params.activePilotsCount,
      pilotsAtRiskCount: params.pilotsAtRiskCount,
      expansionSignals,
      citiesReadiness,
      grossMarginPerNodeInr: params.grossMarginPerNodeInr,
    };
  }
}
