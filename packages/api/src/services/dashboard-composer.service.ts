import { IDataTrustRibbon, IDashboardDefinition, IWidgetContract } from '../db/models/DashboardComposer.js';

export class DashboardComposerService {
  private roleDashboards: Map<string, IDashboardDefinition> = new Map();

  constructor() {
    this.registerDefaultDashboards();
  }

  private registerDefaultDashboards() {
    // 1. Facility Manager Dashboard
    this.registerDashboard({
      dashboardId: 'DASH-FACILITY-MANAGER',
      role: 'FACILITY_MANAGER',
      name: 'Facility Operations Control Room',
      gridColumns: 12,
      widgets: [
        {
          widgetId: 'WGT-PIT-BOARD',
          type: 'STATUS_GRID',
          title: 'Active Pit Health Board',
          metricKeys: ['PIT_HEALTHY_DAYS', 'ODOR_COMPLAINT_COUNT'],
          allowedRoles: ['FACILITY_MANAGER', 'SUPERVISOR', 'AGRONOMIST'],
          refreshIntervalSeconds: 30,
        },
        {
          widgetId: 'WGT-STAGE-FLOW',
          type: 'STAGE_FUNNEL',
          title: 'Yard Stage Queue Flow',
          metricKeys: ['prep_throughput_kg_per_hour'],
          allowedRoles: ['FACILITY_MANAGER'],
          refreshIntervalSeconds: 60,
        },
        {
          widgetId: 'WGT-MONEY-STRIP',
          type: 'MONEY_STRIP',
          title: 'Daily Cost Run Rate',
          metricKeys: ['cost_per_kg_by_stage'],
          allowedRoles: ['FACILITY_MANAGER', 'CLIENT_HEAD', 'FINANCE'],
          refreshIntervalSeconds: 120,
        },
      ],
      dataTrustRibbon: {
        freshnessTimestamp: new Date(),
        dataCoveragePercent: 96,
        evidenceStrengthMix: { strongPercent: 85, moderatePercent: 15, weakPercent: 0 },
      },
    });

    // 2. Client Head Dashboard
    this.registerDashboard({
      dashboardId: 'DASH-CLIENT-HEAD',
      role: 'CLIENT_HEAD',
      name: 'Client Head Cockpit',
      gridColumns: 12,
      widgets: [
        {
          widgetId: 'WGT-OUTCOMES-KPI',
          type: 'KPI_CARD',
          title: 'Waste Diverted vs Landfill Target',
          metricKeys: ['TOTAL_WASTE_DIVERTED_KG', 'CARBON_OFFSET_MTCO2E'],
          allowedRoles: ['CLIENT_HEAD', 'SUPREME_HEAD'],
          refreshIntervalSeconds: 300,
        },
        {
          widgetId: 'WGT-BUDGET-VARIANCE',
          type: 'MONEY_STRIP',
          title: 'Operating Cost vs Monthly Budget',
          metricKeys: ['budget_variance_pct'],
          allowedRoles: ['CLIENT_HEAD', 'FINANCE'],
          refreshIntervalSeconds: 300,
        },
      ],
      dataTrustRibbon: {
        freshnessTimestamp: new Date(),
        dataCoveragePercent: 98,
        evidenceStrengthMix: { strongPercent: 90, moderatePercent: 10, weakPercent: 0 },
      },
    });
  }

  registerDashboard(dash: Partial<IDashboardDefinition>): IDashboardDefinition {
    const doc: any = {
      dashboardId: dash.dashboardId!,
      role: dash.role!,
      name: dash.name!,
      gridColumns: dash.gridColumns || 12,
      widgets: dash.widgets || [],
      dataTrustRibbon: dash.dataTrustRibbon || {
        freshnessTimestamp: new Date(),
        dataCoveragePercent: 100,
        evidenceStrengthMix: { strongPercent: 80, moderatePercent: 20, weakPercent: 0 },
      },
    };
    this.roleDashboards.set(doc.role, doc);
    return doc;
  }

  getDashboardForRole(role: string): IDashboardDefinition | undefined {
    return this.roleDashboards.get(role);
  }

  /**
   * Evaluates Data-Trust Ribbon for a dashboard
   */
  evaluateDataTrust(params: {
    lastTelemetryReceivedAt: Date;
    missingCheckCount: number;
    totalExpectedChecks: number;
    strongClaimsCount: number;
    totalClaimsCount: number;
  }): IDataTrustRibbon {
    const dataCoveragePercent =
      params.totalExpectedChecks > 0
        ? Math.round(((params.totalExpectedChecks - params.missingCheckCount) / params.totalExpectedChecks) * 100)
        : 100;

    const strongPercent =
      params.totalClaimsCount > 0
        ? Math.round((params.strongClaimsCount / params.totalClaimsCount) * 100)
        : 100;

    const moderatePercent = 100 - strongPercent;

    return {
      freshnessTimestamp: params.lastTelemetryReceivedAt,
      dataCoveragePercent,
      evidenceStrengthMix: {
        strongPercent,
        moderatePercent,
        weakPercent: 0,
      },
    };
  }
}

export const dashboardComposerService = new DashboardComposerService();
