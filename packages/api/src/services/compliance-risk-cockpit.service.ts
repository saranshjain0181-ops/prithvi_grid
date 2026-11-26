import crypto from 'node:crypto';
import { IStatutoryBreachRecord } from '../db/models/ComplianceRiskCockpit.js';

export interface ComplianceRiskAssessment {
  overallComplianceScorePct: number;
  breachesCount: number;
  highestExposure: 'LOW' | 'MEDIUM' | 'HIGH' | 'STATUTORY_SHUTDOWN';
  isAuditPackEligible: boolean;
  tamperHashSha256: string;
  legalAdvisoryHindi: string;
}

export class ComplianceRiskCockpitService {
  /**
   * Deterministically evaluates statutory compliance checklist and produces tamper-sealed audit hash
   */
  evaluateCompliance(params: {
    facilityId: string;
    auditPeriodMonth: string;
    thermalPathogenKillPassed: boolean;
    finishedMoisturePct: number; // must be <= 25%
    leachateZeroDischargeVerified: boolean;
    perimeterOdorComplaintsCount: number;
  }): ComplianceRiskAssessment {
    const breaches: IStatutoryBreachRecord[] = [];

    // 1. SWM 2016 Thermal Pathogen Kill
    if (!params.thermalPathogenKillPassed) {
      breaches.push({
        ruleCode: 'SWM_2016_THERMAL_KILL',
        standardDescription: 'न्यूनतम 55°C पर लगातार 72 घंटे एवं 2 बार पलटाई (रोगाणु निष्क्रियता)',
        observedValue: 'अपर्याप्त थर्मल घंटे',
        thresholdLimit: '>= 55°C for 3 days',
        isBreached: true,
        legalExposure: 'HIGH',
      });
    }

    // 2. FCO Moisture limit <= 25%
    if (params.finishedMoisturePct > 25) {
      breaches.push({
        ruleCode: 'FCO_MOISTURE_LIMIT',
        standardDescription: 'तैयार कंपोस्ट में अधिकतम अनुमेय नमी 25%',
        observedValue: `${params.finishedMoisturePct}%`,
        thresholdLimit: '<= 25%',
        isBreached: true,
        legalExposure: 'MEDIUM',
      });
    }

    // 3. CPCB Zero Leachate Discharge
    if (!params.leachateZeroDischargeVerified) {
      breaches.push({
        ruleCode: 'CPCB_ZERO_DISCHARGE',
        standardDescription: 'भूजल प्रदूषण रोकथाम — लीचेट का शून्य भू-विसर्जन',
        observedValue: 'लीचेट रिसाव दर्ज',
        thresholdLimit: '100% संचयन व उपचार',
        isBreached: true,
        legalExposure: 'STATUTORY_SHUTDOWN',
      });
    }

    // 4. Perimeter Odor
    if (params.perimeterOdorComplaintsCount > 3) {
      breaches.push({
        ruleCode: 'MUNICIPAL_ODOR_NUISANCE',
        standardDescription: 'परिसर सीमा के बाहर गंध की शिकायतें',
        observedValue: `${params.perimeterOdorComplaintsCount} शिकायतें`,
        thresholdLimit: '<= 3 शिकायतें प्रति माह',
        isBreached: true,
        legalExposure: 'LOW',
      });
    }

    // Scoring
    const totalChecks = 4;
    const passedChecks = totalChecks - breaches.length;
    const overallComplianceScorePct = Math.round((passedChecks / totalChecks) * 100);

    let highestExposure: 'LOW' | 'MEDIUM' | 'HIGH' | 'STATUTORY_SHUTDOWN' = 'LOW';
    if (breaches.some((b) => b.legalExposure === 'STATUTORY_SHUTDOWN')) {
      highestExposure = 'STATUTORY_SHUTDOWN';
    } else if (breaches.some((b) => b.legalExposure === 'HIGH')) {
      highestExposure = 'HIGH';
    } else if (breaches.some((b) => b.legalExposure === 'MEDIUM')) {
      highestExposure = 'MEDIUM';
    }

    const isAuditPackEligible = highestExposure !== 'STATUTORY_SHUTDOWN';

    // Digital Tamper-proof Evidence Hash (SHA-256)
    const payloadToHash = JSON.stringify({
      facilityId: params.facilityId,
      auditPeriodMonth: params.auditPeriodMonth,
      score: overallComplianceScorePct,
      breaches,
      evaluatedAt: new Date().toISOString().split('T')[0],
    });
    const tamperHashSha256 = crypto.createHash('sha256').update(payloadToHash).digest('hex');

    let advisoryHindi = '';
    if (highestExposure === 'STATUTORY_SHUTDOWN') {
      advisoryHindi = '[CRITICAL-LEGAL] लीचेट शून्य-डिस्चार्ज का उल्लंघन। विधिक दंड अथवा सीलिंग से बचाव हेतु तुरंत पंपिंग व सीलिंग करें। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]';
    } else if (breaches.length > 0) {
      advisoryHindi = `वैधानिक अनुपालन स्कोर: ${overallComplianceScorePct}%. ${breaches.length} सुधार योग्य बिंदु पाए गए। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else {
      advisoryHindi = `शत-प्रतिशत वैधानिक अनुपालन (SWM 2016, FCO & CPCB मानक पूर्ण)। साक्ष्य पैक विधिक रूप से हस्ताक्षरित हेतु तैयार है। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      overallComplianceScorePct,
      breachesCount: breaches.length,
      highestExposure,
      isAuditPackEligible,
      tamperHashSha256,
      legalAdvisoryHindi: advisoryHindi,
    };
  }
}

export const complianceRiskCockpitService = new ComplianceRiskCockpitService();
