import { IAgronomyReviewQueueItem, IBiologicalBenchmark } from '../db/models/AgronomyCockpit.js';

export interface AgronomyCockpitSummary {
  benchmarks: IBiologicalBenchmark[];
  reviewQueue: IAgronomyReviewQueueItem[];
  highPriorityReviewsCount: number;
  overallFleetBiologicalScorePct: number;
  expertAgronomicAdvisoryHindi: string;
}

export class AgronomyCockpitService {
  /**
   * Evaluates cross-fleet biological performance and prioritizes agronomy review items
   */
  evaluateFleetAgronomy(params: {
    avgDaysThermophilic: number;
    avgHoursToFirstPeak: number;
    avgAcidCrashRecoveryHours: number;
    avgFinishedCnRatio: number;
    pendingReviews: IAgronomyReviewQueueItem[];
  }): AgronomyCockpitSummary {
    const benchmarks: IBiologicalBenchmark[] = [
      {
        metricKey: 'DAYS_IN_THERMOPHILIC',
        metricName: 'थर्मोफिलिक अवधि (दिन)',
        fleetAverage: params.avgDaysThermophilic,
        benchmarkTarget: 14,
        unit: 'दिन',
        status: params.avgDaysThermophilic >= 12 ? 'EXCELLENT' : 'SUB_OPTIMAL',
      },
      {
        metricKey: 'HOURS_TO_FIRST_PEAK',
        metricName: 'प्रथम ताप शिखर (घंटे)',
        fleetAverage: params.avgHoursToFirstPeak,
        benchmarkTarget: 48,
        unit: 'घंटे',
        status: params.avgHoursToFirstPeak <= 60 ? 'EXCELLENT' : 'NORMAL',
      },
      {
        metricKey: 'ACID_CRASH_RECOVERY_HOURS',
        metricName: 'एसिड क्रैश रिकवरी गति',
        fleetAverage: params.avgAcidCrashRecoveryHours,
        benchmarkTarget: 36,
        unit: 'घंटे',
        status: params.avgAcidCrashRecoveryHours <= 48 ? 'NORMAL' : 'SUB_OPTIMAL',
      },
      {
        metricKey: 'FINISHED_CN_RATIO',
        metricName: 'तैयार खाद C:N अनुपात',
        fleetAverage: params.avgFinishedCnRatio,
        benchmarkTarget: 18,
        unit: 'अनुपात',
        status: params.avgFinishedCnRatio >= 15 && params.avgFinishedCnRatio <= 22 ? 'EXCELLENT' : 'SUB_OPTIMAL',
      },
    ];

    const excellentCount = benchmarks.filter((b) => b.status === 'EXCELLENT').length;
    const overallFleetBiologicalScorePct = Math.round((excellentCount / benchmarks.length) * 100);

    const highPriorityReviews = params.pendingReviews.filter((r) => r.severity === 'CRITICAL');

    let advisoryHindi = '';
    if (highPriorityReviews.length > 0) {
      advisoryHindi = `चेतावनी: ${highPriorityReviews.length} गड्ढों में गंभीर जैविक असंतुलन (एसिड क्रैश/जलभराव) दर्ज है। तुरंत चूना/लकड़ी की राख और पलटाई का निर्देश दें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else {
      advisoryHindi = `फ्लीट में जैविक प्रक्रियाएं स्थिर हैं (थर्मोफिलिक औसत: ${params.avgDaysThermophilic} दिन)। कोई गंभीर विचलन नहीं। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      benchmarks,
      reviewQueue: params.pendingReviews,
      highPriorityReviewsCount: highPriorityReviews.length,
      overallFleetBiologicalScorePct,
      expertAgronomicAdvisoryHindi: advisoryHindi,
    };
  }
}

export const agronomyCockpitService = new AgronomyCockpitService();
