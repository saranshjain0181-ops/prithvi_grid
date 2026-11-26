import { AiGatewayService } from './ai-gateway.service';

/**
 * EVIDENCE STRENGTH SCORING SYSTEM (Workstream F6 / Feature 6)
 * [LEGAL-REVIEW REQUIRED]:
 * All weights, thresholds, and penalty formulas are versioned and audited.
 * No subjective adjustments or uncalibrated weights may be introduced without agronomist & legal sign-off.
 */

export const EVIDENCE_STRENGTH_WEIGHTS = {
  VERSION: '2026.1',
  COVERAGE_WEIGHT: 0.25,
  SENSOR_TRUST_WEIGHT: 0.25,
  CORROBORATION_WEIGHT: 0.20,
  FRESHNESS_WEIGHT: 0.15,
  HUMAN_ATTESTATION_WEIGHT: 0.15,
  POST_SEAL_AMENDMENT_PENALTY: 15,
  THRESHOLDS: {
    STRONG_MIN: 80,
    MODERATE_MIN: 55,
  },
} as const;

export type EvidenceStrengthTier = 'STRONG' | 'MODERATE' | 'WEAK';

export interface EvidenceStrengthInputs {
  coveragePct: number; // 0 to 100
  sensorTrustPct: number; // 0 to 100 (from SensorTrustScore)
  corroborationPct: number; // 0 to 100 (cross-sensor or physical vs virtual agreement)
  freshnessPct: number; // 0 to 100 (temporal decay based on telemetry recency)
  humanAttestationPct: number; // 0 to 100 (100 for supervisor photo, 50 for worker voice, 0 for unverified)
  isAmendedPostSeal: boolean; // True if record was modified after daily seal
  calibrationAgeDays?: number;
  uncalibratedSensors?: string[];
}

export interface StructuredEvidenceGap {
  gapCategory: 'COVERAGE_DEFICIT' | 'SENSOR_TRUST_DEGRADED' | 'CALIBRATION_OVERDUE' | 'LACK_OF_CORROBORATION' | 'UNVERIFIED_LABOUR' | 'AMENDMENT_PENALTY';
  sensor?: string;
  impactPoints: number;
  remediationKey: string;
  defaultActionEn: string;
  defaultActionHi: string;
}

export interface EvidenceStrengthResult {
  score: number; // 0 to 100
  tier: EvidenceStrengthTier;
  components: {
    coverageScore: number;
    sensorTrustScore: number;
    corroborationScore: number;
    freshnessScore: number;
    humanAttestationScore: number;
    amendmentPenalty: number;
  };
  gaps: StructuredEvidenceGap[];
  remediationSuggestion: string; // Plain-language Hindi or English guidance
  formulaVersion: string;
}

const aiGateway = new AiGatewayService();

/**
 * Computes deterministic multi-factor Evidence Strength Score.
 */
export function calculateEvidenceStrength(inputs: EvidenceStrengthInputs): EvidenceStrengthResult {
  const w = EVIDENCE_STRENGTH_WEIGHTS;

  const coverageScore = Math.max(0, Math.min(100, inputs.coveragePct)) * w.COVERAGE_WEIGHT;
  const sensorTrustScore = Math.max(0, Math.min(100, inputs.sensorTrustPct)) * w.SENSOR_TRUST_WEIGHT;
  const corroborationScore = Math.max(0, Math.min(100, inputs.corroborationPct)) * w.CORROBORATION_WEIGHT;
  const freshnessScore = Math.max(0, Math.min(100, inputs.freshnessPct)) * w.FRESHNESS_WEIGHT;
  const humanAttestationScore = Math.max(0, Math.min(100, inputs.humanAttestationPct)) * w.HUMAN_ATTESTATION_WEIGHT;
  const amendmentPenalty = inputs.isAmendedPostSeal ? w.POST_SEAL_AMENDMENT_PENALTY : 0;

  const rawScore = coverageScore + sensorTrustScore + corroborationScore + freshnessScore + humanAttestationScore - amendmentPenalty;
  const finalScore = Number(Math.max(0, Math.min(100, rawScore)).toFixed(1));

  let tier: EvidenceStrengthTier = 'WEAK';
  if (finalScore >= w.THRESHOLDS.STRONG_MIN) {
    tier = 'STRONG';
  } else if (finalScore >= w.THRESHOLDS.MODERATE_MIN) {
    tier = 'MODERATE';
  }

  // Detect structured gaps
  const gaps: StructuredEvidenceGap[] = [];

  if (inputs.coveragePct < 85) {
    gaps.push({
      gapCategory: 'COVERAGE_DEFICIT',
      impactPoints: Math.round((85 - inputs.coveragePct) * w.COVERAGE_WEIGHT),
      remediationKey: 'INCREASE_BURST_SAMPLING',
      defaultActionEn: 'Ensure Smart Spear node has sufficient energy to report at scheduled task appointments.',
      defaultActionHi: 'स्मार्ट स्पीयर नोड को निर्धारित समय पर डेटा भेजने के लिए चार्ज रखें।',
    });
  }

  if (inputs.calibrationAgeDays && inputs.calibrationAgeDays > 30) {
    gaps.push({
      gapCategory: 'CALIBRATION_OVERDUE',
      sensor: inputs.uncalibratedSensors?.[0] || 'PH_PROBE',
      impactPoints: 12,
      remediationKey: 'CALIBRATE_PH_BUFFER_7',
      defaultActionEn: `Recalibrate sensor (overdue by ${inputs.calibrationAgeDays} days) with standard buffer solution.`,
      defaultActionHi: `सेंसर कैलिब्रेशन ${inputs.calibrationAgeDays} दिनों से पेंडिंग है, तुरंत बफर सोल्यूशन से कैलिब्रेट करें।`,
    });
  }

  if (inputs.sensorTrustPct < 70) {
    gaps.push({
      gapCategory: 'SENSOR_TRUST_DEGRADED',
      impactPoints: Math.round((70 - inputs.sensorTrustPct) * w.SENSOR_TRUST_WEIGHT),
      remediationKey: 'RUN_SENSOR_DIAGNOSTICS',
      defaultActionEn: 'Run sensor self-cleaning and inspect probes for biological fouling or crusting.',
      defaultActionHi: 'सेंसर को साफ करें और बायो-फाउलिंग की जांच करें।',
    });
  }

  if (inputs.corroborationPct < 65) {
    gaps.push({
      gapCategory: 'LACK_OF_CORROBORATION',
      impactPoints: Math.round((65 - inputs.corroborationPct) * w.CORROBORATION_WEIGHT),
      remediationKey: 'VERIFY_SECONDARY_MEASUREMENTS',
      defaultActionEn: 'Cross-verify readings with secondary physical probe or compost thermometer.',
      defaultActionHi: 'रीडिंग्स को दूसरे थर्मामीटर या मैन्युअल जांच से क्रॉस-वेरीफाई करें।',
    });
  }

  if (inputs.humanAttestationPct < 50) {
    gaps.push({
      gapCategory: 'UNVERIFIED_LABOUR',
      impactPoints: 8,
      remediationKey: 'LOG_MANAGER_SIGNOFF',
      defaultActionEn: 'Request BWG Manager supervisory sign-off or photo proof for this batch.',
      defaultActionHi: 'इस बैच के लिए सुपरवाइजर से फोटो वेरिफिकेशन या अप्रूवल प्राप्त करें।',
    });
  }

  if (inputs.isAmendedPostSeal) {
    gaps.push({
      gapCategory: 'AMENDMENT_PENALTY',
      impactPoints: w.POST_SEAL_AMENDMENT_PENALTY,
      remediationKey: 'DOCUMENT_AMENDMENT_REASON',
      defaultActionEn: 'Historical data was amended after daily seal. Attach official justification in audit trail.',
      defaultActionHi: 'सील के बाद डेटा संशोधित किया गया था। ऑडिट रिकॉर्ड में उचित कारण दर्ज करें।',
    });
  }

  // Generate plain-language remediation text
  let remediationSuggestion = 'Evidence level is optimal and meets municipal compliance standards.';
  if (tier !== 'STRONG') {
    if (gaps.length > 0) {
      remediationSuggestion = `${gaps[0].defaultActionEn} (${gaps[0].defaultActionHi})`;
    } else {
      remediationSuggestion = 'Maintain continuous telemetry coverage to preserve Strong evidence tier.';
    }
  }

  return {
    score: finalScore,
    tier,
    components: {
      coverageScore: Number(coverageScore.toFixed(1)),
      sensorTrustScore: Number(sensorTrustScore.toFixed(1)),
      corroborationScore: Number(corroborationScore.toFixed(1)),
      freshnessScore: Number(freshnessScore.toFixed(1)),
      humanAttestationScore: Number(humanAttestationScore.toFixed(1)),
      amendmentPenalty,
    },
    gaps,
    remediationSuggestion,
    formulaVersion: w.VERSION,
  };
}

export class EvidenceStrengthService {
  /**
   * Evaluates evidence strength and enriches with Gemini plain-language explanations
   */
  public async evaluateEvidenceWithAi(
    inputs: EvidenceStrengthInputs,
    preferredLanguage: 'hi' | 'en' = 'en'
  ): Promise<EvidenceStrengthResult> {
    const result = calculateEvidenceStrength(inputs);

    if (result.tier === 'STRONG' || result.gaps.length === 0) {
      return result;
    }

    try {
      // Use Gemini via AI Gateway to create a natural, polite 1-sentence remediation phrase
      const gapSummary = result.gaps.map((g) => g.gapCategory).join(', ');
      const prompt = `Given compost evidence gaps [${gapSummary}] and evidence tier ${result.tier}, produce exactly ONE polite, concise sentence in ${preferredLanguage === 'hi' ? 'Hindi' : 'English'} advising the manager what specific action will restore rating to Strong. Avoid preamble.`;

      const aiRes = await aiGateway.generateChatAdvice({
        message: prompt,
        role: 'BWG_MANAGER',
      });

      if (aiRes.reply && aiRes.reply.trim().length > 0) {
        result.remediationSuggestion = aiRes.reply.trim();
      }
    } catch {
      // Deterministic fallback already in place
    }

    return result;
  }
}

export const evidenceStrengthService = new EvidenceStrengthService();
