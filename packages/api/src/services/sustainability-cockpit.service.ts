import crypto from 'node:crypto';
import { IClaimsRegisterItem } from '../db/models/SustainabilityCockpit.js';

export interface SustainabilityEvaluationResult {
  landfillDivertedMassMt: number;
  avoidedMethaneEmissionsMt: number;
  netCarbonAbatementMtCo2e: number;
  annualTargetCommitmentPct: number;
  claimsRegister: IClaimsRegisterItem[];
  blockedWeakClaimsCount: number;
  assurancePackageHashSha256: string;
  advisoryHindi: string;
}

export class SustainabilityCockpitService {
  /**
   * Deterministically evaluates landfill diversion, GHG abatement, and enforces strict anti-greenwashing Claims Register
   */
  evaluateSustainability(params: {
    facilityId: string;
    landfillDivertedMassMt: number;
    annualTargetMt?: number;
    measuredProvenancePct?: number;
    candidateClaims: Array<{
      claimId: string;
      claimHeadline: string;
      metricValue: string;
      evidenceStrengthTier: 'STRONG' | 'MODERATE' | 'WEAK';
      methodologySource: string;
    }>;
  }): SustainabilityEvaluationResult {
    const divertedMt = Math.max(0, params.landfillDivertedMassMt);
    // IPCC composting factor: 1 MT wet organic waste diverted avoids ~62.5 kg CH4 emissions
    const avoidedMethaneEmissionsMt = Math.round((divertedMt * 0.0625) * 100) / 100;
    // GWP of methane (AR5) = 28x CO2 equivalent
    const netCarbonAbatementMtCo2e = Math.round((avoidedMethaneEmissionsMt * 28) * 100) / 100;

    const annualTarget = params.annualTargetMt || 1000;
    const annualTargetCommitmentPct = Math.round((divertedMt / annualTarget) * 100 * 10) / 10;

    // Claims Register evaluation: strictly block claims with WEAK evidence from public pages/ESG decks
    let blockedWeakClaimsCount = 0;
    const claimsRegister: IClaimsRegisterItem[] = params.candidateClaims.map((c) => {
      const isPublicMarketingPermitted = c.evidenceStrengthTier !== 'WEAK';
      if (!isPublicMarketingPermitted) blockedWeakClaimsCount++;

      return {
        ...c,
        isPublicMarketingPermitted,
      };
    });

    const assurancePackageHashSha256 = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          facilityId: params.facilityId,
          divertedMt,
          avoidedMethaneEmissionsMt,
          netCarbonAbatementMtCo2e,
          claimsRegister,
        })
      )
      .digest('hex');

    let advisoryHindi = '';
    if (blockedWeakClaimsCount > 0) {
      advisoryHindi = `ग्रीनवाशिंग सुरक्षा (Anti-Greenwashing Guard): ${blockedWeakClaimsCount} दावे कमजोर डेटा पर आधारित होने के कारण सार्वजनिक रिपोर्टिंग से रोके गए हैं। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else {
      advisoryHindi = `सस्टेनेबिलिटी रिकॉर्ड पूर्णतः सत्यापित: ${divertedMt} MT कचरा लैंडफिल से डाइवर्ट, ${avoidedMethaneEmissionsMt} MT मीथेन उत्सर्जन रोका गया। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      landfillDivertedMassMt: divertedMt,
      avoidedMethaneEmissionsMt,
      netCarbonAbatementMtCo2e,
      annualTargetCommitmentPct,
      claimsRegister,
      blockedWeakClaimsCount,
      assurancePackageHashSha256,
      advisoryHindi,
    };
  }
}

export const sustainabilityCockpitService = new SustainabilityCockpitService();
