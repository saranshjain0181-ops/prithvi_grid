import { ITrustRemediationAction } from '../db/models/DataTrustCockpit.js';

export interface DataTrustEvaluationResult {
  compositeTrustIndexPct: number;
  trustTier: 'STRONG' | 'MODERATE' | 'WEAK';
  components: {
    instrumentsScore: number;
    coverageScore: number;
    corroborationScore: number;
    imageQualityScore: number;
    provenanceMeasuredPct: number;
    freshnessScore: number;
  };
  topThreeRemediations: ITrustRemediationAction[];
  summaryAdvisoryHindi: string;
}

export class DataTrustCockpitService {
  /**
   * Deterministically evaluates measurement trust health across instruments, coverage, corroboration & provenance
   */
  evaluateDataTrust(params: {
    instrumentsScore: number;
    coverageScore: number;
    corroborationScore: number;
    imageQualityScore?: number;
    provenanceMeasuredPct?: number;
    freshnessScore?: number;
    overdueInstrumentsCount?: number;
  }): DataTrustEvaluationResult {
    const inst = Math.max(0, Math.min(100, params.instrumentsScore));
    const cov = Math.max(0, Math.min(100, params.coverageScore));
    const corr = Math.max(0, Math.min(100, params.corroborationScore));
    const img = Math.max(0, Math.min(100, params.imageQualityScore ?? 85));
    const prov = Math.max(0, Math.min(100, params.provenanceMeasuredPct ?? 80));
    const fresh = Math.max(0, Math.min(100, params.freshnessScore ?? 90));

    // Weighted composite Trust Index:
    // Instruments: 25%, Coverage: 20%, Corroboration: 20%, Freshness: 15%, Provenance: 10%, Images: 10%
    const compositeTrustIndexPct = Math.round(
      inst * 0.25 + cov * 0.2 + corr * 0.2 + fresh * 0.15 + prov * 0.1 + img * 0.1
    );

    let trustTier: 'STRONG' | 'MODERATE' | 'WEAK' = 'MODERATE';
    if (compositeTrustIndexPct >= 80) {
      trustTier = 'STRONG';
    } else if (compositeTrustIndexPct < 60) {
      trustTier = 'WEAK';
    }

    // Candidate remediation actions ranked by impact vs effort
    const candidates: ITrustRemediationAction[] = [];

    if (inst < 75 || (params.overdueInstrumentsCount && params.overdueInstrumentsCount > 0)) {
      candidates.push({
        actionId: 'ACT-CALIBRATE-SCALE',
        costTier: 'LOW_EFFORT',
        expectedTrustScoreGainPct: 8,
        descriptionHindi: 'धर्मकांटा व डिजिटल तराजू का मानक बाट (Standard Weight) से सत्यापन करें। [NEEDS-NATIVE-REVIEW]',
      });
    }

    if (corr < 75) {
      candidates.push({
        actionId: 'ACT-MAPPING-ROUND',
        costTier: 'ZERO_COST',
        expectedTrustScoreGainPct: 6,
        descriptionHindi: 'गड्ढे का 4-बिंदु तापमान सर्वेक्षण (Pile Mapping Round) पूर्ण करें ताकि स्पीयर का ऑफसेट स्पष्ट हो। [NEEDS-NATIVE-REVIEW]',
      });
    }

    if (img < 75) {
      candidates.push({
        actionId: 'ACT-CLEAN-LENS',
        costTier: 'ZERO_COST',
        expectedTrustScoreGainPct: 4,
        descriptionHindi: 'स्मार्ट स्पीयर कैमरा विंडो को सूखे कपड़े से पोंछें (धूल/भाप हटाएं)। [NEEDS-NATIVE-REVIEW]',
      });
    }

    // Default continuous improvement actions to guarantee exactly 3 top actions
    const defaultActions: ITrustRemediationAction[] = [
      {
        actionId: 'ACT-SENSE-CHECK',
        costTier: 'ZERO_COST',
        expectedTrustScoreGainPct: 3,
        descriptionHindi: 'साप्ताहिक मुट्ठी परीक्षण (Sense Check) दर्ज करें। [NEEDS-NATIVE-REVIEW]',
      },
      {
        actionId: 'ACT-CALENDAR-FILL',
        costTier: 'ZERO_COST',
        expectedTrustScoreGainPct: 3,
        descriptionHindi: 'छुट्टी के दिनों का कचरा वजन अनुमान (Coverage Calendar) अद्यतन करें। [NEEDS-NATIVE-REVIEW]',
      },
      {
        actionId: 'ACT-PH-PROBE-CLEAN',
        costTier: 'LOW_EFFORT',
        expectedTrustScoreGainPct: 2,
        descriptionHindi: 'पोर्टेबल pH मीटर के इलेक्ट्रोड को डिस्टिल्ड पानी से धोएं। [NEEDS-NATIVE-REVIEW]',
      },
    ];

    for (const def of defaultActions) {
      if (candidates.length >= 3) break;
      if (!candidates.some((c) => c.actionId === def.actionId)) {
        candidates.push(def);
      }
    }

    const topThreeRemediations = candidates.slice(0, 3);

    let summaryAdvisoryHindi = '';
    if (trustTier === 'STRONG') {
      summaryAdvisoryHindi = `डेटा विश्वसनीयता उत्कृष्ट है (${compositeTrustIndexPct}% - Strong Evidence). सभी वैधानिक व वाणिज्यिक दावे विश्वसनीय हैं। [NEEDS-NATIVE-REVIEW]`;
    } else if (trustTier === 'MODERATE') {
      summaryAdvisoryHindi = `मध्यम विश्वसनीयता (${compositeTrustIndexPct}%). कुछ उपकरणों का अंशांकन लंबित है। [NEEDS-NATIVE-REVIEW]`;
    } else {
      summaryAdvisoryHindi = `सावधान: कमजोर डेटा विश्वास (${compositeTrustIndexPct}% - Weak). जब तक कैलिब्रेशन पूरा न हो, सार्वजनिक रिपोर्ट न निकालें। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      compositeTrustIndexPct,
      trustTier,
      components: {
        instrumentsScore: inst,
        coverageScore: cov,
        corroborationScore: corr,
        imageQualityScore: img,
        provenanceMeasuredPct: prov,
        freshnessScore: fresh,
      },
      topThreeRemediations,
      summaryAdvisoryHindi,
    };
  }
}

export const dataTrustCockpitService = new DataTrustCockpitService();
