import { IClientHeadSectionSummary } from '../db/models/ClientHeadCockpit.js';

export interface EvaluateClientCockpitInput {
  totalWasteDivertedKg: number;
  totalCompostProducedKg: number;
  operatingCostPerKgInr: number;
  budgetVariancePct: number;
  openLegalNoticesCount: number;
  incidentsLast30DaysCount: number;
  labourCoveragePercent: number;
  certificationsExpiringCount: number;
  gradeAPercent: number;
  odorComplaintsCount: number;
}

export class ClientHeadCockpitService {
  /**
   * Deterministically evaluates the 6 strategic sections of the Client Head Cockpit
   */
  evaluateCockpitSections(input: EvaluateClientCockpitInput): IClientHeadSectionSummary[] {
    const sections: IClientHeadSectionSummary[] = [];

    // 1. OUTCOMES
    sections.push({
      section: 'OUTCOMES',
      status: input.totalWasteDivertedKg > 5000 ? 'GREEN' : 'AMBER',
      headlineMetric: `${input.totalWasteDivertedKg.toLocaleString('en-IN')} kg Diverted`,
      subtext: `${input.totalCompostProducedKg.toLocaleString('en-IN')} kg premium compost harvested. Evidence: STRONG.`,
    });

    // 2. MONEY
    const moneyStatus = input.budgetVariancePct <= 0 ? 'GREEN' : input.budgetVariancePct < 10 ? 'AMBER' : 'RED';
    sections.push({
      section: 'MONEY',
      status: moneyStatus,
      headlineMetric: `₹${input.operatingCostPerKgInr}/kg Net Cost`,
      subtext: input.budgetVariancePct <= 0 ? 'Within approved budget' : `${input.budgetVariancePct}% over budget`,
    });

    // 3. RISK & COMPLIANCE
    const riskStatus = input.openLegalNoticesCount > 0 ? 'RED' : input.incidentsLast30DaysCount > 0 ? 'AMBER' : 'GREEN';
    sections.push({
      section: 'RISK_COMPLIANCE',
      status: riskStatus,
      headlineMetric: input.openLegalNoticesCount === 0 ? '100% Audit Ready' : `${input.openLegalNoticesCount} Action Required`,
      subtext: `${input.incidentsLast30DaysCount} safety incident(s) in last 30 days.`,
    });

    // 4. PEOPLE & OPERATIONS
    const peopleStatus = input.labourCoveragePercent >= 90 ? 'GREEN' : 'AMBER';
    sections.push({
      section: 'PEOPLE_OPERATIONS',
      status: peopleStatus,
      headlineMetric: `${input.labourCoveragePercent}% Labour Coverage`,
      subtext: `${input.certificationsExpiringCount} certification(s) due for refresher.`,
    });

    // 5. QUALITY & PRODUCT
    const qualityStatus = input.gradeAPercent >= 80 ? 'GREEN' : 'AMBER';
    sections.push({
      section: 'QUALITY_PRODUCT',
      status: qualityStatus,
      headlineMetric: `${input.gradeAPercent}% Grade A (FCO 1985)`,
      subtext: 'Meets urban commercial landscape and agriculture standards.',
    });

    // 6. REPUTATION
    const repStatus = input.odorComplaintsCount === 0 ? 'GREEN' : 'AMBER';
    sections.push({
      section: 'REPUTATION',
      status: repStatus,
      headlineMetric: `${input.odorComplaintsCount} Odor Complaints`,
      subtext: input.odorComplaintsCount === 0 ? 'Zero odor incidents. Green Township Badge Active.' : 'Complaints handled within SLA.',
    });

    return sections;
  }
}

export const clientHeadCockpitService = new ClientHeadCockpitService();
