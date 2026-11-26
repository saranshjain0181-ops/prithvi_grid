import { IMetricDefinition, MetricCategory, MetricDictionary } from '../db/models/MetricDictionary.js';

export interface CertifiedMetricRecord {
  metricKey: string;
  displayName: string;
  category: MetricCategory;
  certifiedFormula: string;
  unit: string;
  isEstimated: boolean;
  value: number;
}

export class ReportStudioService {
  /**
   * Pre-registered standard dictionary of certified metrics
   */
  private static STANDARD_METRICS: Array<{
    metricKey: string;
    displayName: string;
    category: MetricCategory;
    certifiedFormula: string;
    unit: string;
    isEstimated: boolean;
    description: string;
  }> = [
    {
      metricKey: 'TOTAL_WASTE_DIVERTED_KG',
      displayName: 'Total Organic Waste Diverted from Landfill',
      category: 'SUSTAINABILITY',
      certifiedFormula: 'SUM(KhadKachraFlow.wetWasteIntakeKg)',
      unit: 'kg',
      isEstimated: false,
      description: 'Sum of all certified scale-weighed wet organic waste intakes at the yard.',
    },
    {
      metricKey: 'COMPOST_PRODUCED_KG',
      displayName: 'Finished Screened Compost Produced',
      category: 'OPERATIONAL',
      certifiedFormula: 'SUM(CurePile.screeningYield.fineCompostYieldKg)',
      unit: 'kg',
      isEstimated: false,
      description: 'Total weight of certified screened compost passing 4mm/8mm mesh.',
    },
    {
      metricKey: 'CARBON_OFFSET_MTCO2E',
      displayName: 'Net Avoided GHG Emissions',
      category: 'SUSTAINABILITY',
      certifiedFormula: '(TOTAL_WASTE_DIVERTED_KG * 0.62) / 1000',
      unit: 'MTCO2e',
      isEstimated: true,
      description: 'Estimated methane avoidance compared to unmanaged open anaerobic landfilling (IPCC Waste model).',
    },
    {
      metricKey: 'TRUCK_ROLLS_AVOIDED',
      displayName: 'Client Light Maintenance Truck Rolls Saved',
      category: 'FINANCIAL',
      certifiedFormula: 'COUNT(CareRound WHERE truckRollAvoided = TRUE)',
      unit: 'trips',
      isEstimated: false,
      description: 'Count of hardware service trips avoided via guided client staff fin & probe care.',
    },
  ];

  /**
   * Returns list of standard certified metrics
   */
  getStandardMetrics() {
    return ReportStudioService.STANDARD_METRICS;
  }

  /**
   * Evaluates certified metric calculation deterministically
   */
  computeCertifiedMetric(metricKey: string, rawValues: Record<string, number>): CertifiedMetricRecord {
    const meta = ReportStudioService.STANDARD_METRICS.find((m) => m.metricKey === metricKey);
    if (!meta) {
      throw new Error(`Metric ${metricKey} is not registered in the Metric Dictionary.`);
    }

    let calculatedValue = 0;
    if (metricKey === 'TOTAL_WASTE_DIVERTED_KG') {
      calculatedValue = rawValues.totalWetWasteKg || 0;
    } else if (metricKey === 'COMPOST_PRODUCED_KG') {
      calculatedValue = rawValues.totalCompostKg || 0;
    } else if (metricKey === 'CARBON_OFFSET_MTCO2E') {
      const wasteKg = rawValues.totalWetWasteKg || 0;
      // IPCC avoidance factor: 0.62 kg CO2e per kg organic waste diverted from anaerobic landfill
      calculatedValue = Math.round(((wasteKg * 0.62) / 1000) * 100) / 100;
    } else if (metricKey === 'TRUCK_ROLLS_AVOIDED') {
      calculatedValue = rawValues.truckRollsAvoidedCount || 0;
    }

    return {
      metricKey: meta.metricKey,
      displayName: meta.displayName,
      category: meta.category,
      certifiedFormula: meta.certifiedFormula,
      unit: meta.unit,
      isEstimated: meta.isEstimated,
      value: calculatedValue,
    };
  }
}

export const reportStudioService = new ReportStudioService();
