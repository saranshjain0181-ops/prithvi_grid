import { DifficultStreamType, IStreamRule } from '../db/models/DifficultWasteStreams.js';

export interface StreamEvaluationResult {
  isLoadAcceptable: boolean;
  breachedStreams: Array<{
    streamType: DifficultStreamType;
    actualSharePct: number;
    maxAllowedSharePct: number;
    riskCategory: string;
  }>;
  mandatoryPreTreatmentsHindi: string[];
  sourceFeedbackMessageHindi: string;
}

export class DifficultStreamsService {
  private rules: Record<DifficultStreamType, IStreamRule> = {
    COOKED_RICE_DAL: {
      streamType: 'COOKED_RICE_DAL',
      maxSharePct: 15,
      preTreatmentsRequired: ['मिश्रण में 20% सूखा कार्बन मिलाएं', 'अम्लता जांचें'],
      riskCategory: 'ACID_CRASH',
      instructionHindi: 'पका चावल व दाल तुरंत सड़कर एसिड क्रैश करती है। 15% से अधिक न डालें। [EXPERT-REVIEW]',
    },
    CITRUS_ONION_PEEL: {
      streamType: 'CITRUS_ONION_PEEL',
      maxSharePct: 12,
      preTreatmentsRequired: ['लकड़ी की राख बुरकें', 'समान परत बनाएं'],
      riskCategory: 'ACID_CRASH',
      instructionHindi: 'नींबू व प्याज के छिलके जीवाणुओं की वृद्धि रोकते हैं। अधिकतम 12% रखें। [EXPERT-REVIEW]',
    },
    PICKLES_BRINE: {
      streamType: 'PICKLES_BRINE',
      maxSharePct: 5,
      preTreatmentsRequired: ['खारा पानी निथारें', 'सॉल्ट गार्ड जांच करें'],
      riskCategory: 'SALT_TOXICITY',
      instructionHindi: 'अचार व नमकीन खाद्य का नमक मिट्टी के लिए हानिकारक है। अधिकतम 5% रखें। [EXPERT-REVIEW]',
    },
    TENDER_COCONUT_SHELLS: {
      streamType: 'TENDER_COCONUT_SHELLS',
      maxSharePct: 25,
      preTreatmentsRequired: ['श्रेडर से दो टुकड़ों में काटें'],
      riskCategory: 'SLOW_DECAY',
      instructionHindi: 'नारियल के खोल को बिना तोड़े न डालें, यह महीनों तक नहीं गलता। [NEEDS-NATIVE-REVIEW]',
    },
    BANANA_STEMS_FIBER: {
      streamType: 'BANANA_STEMS_FIBER',
      maxSharePct: 20,
      preTreatmentsRequired: ['रेशेदार तने को 10 सेमी टुकड़ों में काटें'],
      riskCategory: 'EQUIPMENT_JAM',
      instructionHindi: 'केले का तना श्रेडर ब्लेड पर लिपट सकता है। पूर्व-कटाई अनिवार्य। [NEEDS-NATIVE-REVIEW]',
    },
    TEMPLE_FESTIVAL_FLOWERS: {
      streamType: 'TEMPLE_FESTIVAL_FLOWERS',
      maxSharePct: 30,
      preTreatmentsRequired: ['धागे व प्लास्टिक अलग करें', 'धूप में हल्का सुखाएं'],
      riskCategory: 'ODOR_FLIES',
      instructionHindi: 'मंदिर व पूजा के फूलों से धागे व पॉलीथिन पहले निकालें। [NEEDS-NATIVE-REVIEW]',
    },
    DAIRY_RESIDUES: {
      streamType: 'DAIRY_RESIDUES',
      maxSharePct: 8,
      preTreatmentsRequired: ['शीघ्र पलटाई करें', 'मक्खी रोधी कवर लगाएं'],
      riskCategory: 'ODOR_FLIES',
      instructionHindi: 'दूध व पनीर के अवशेष तीव्र दुर्गंध पैदा करते हैं। [NEEDS-NATIVE-REVIEW]',
    },
  };

  /**
   * Deterministically evaluates waste load stream mix and applies pre-treatment limits
   */
  evaluateStreams(params: {
    totalLoadMassKg: number;
    streams: Array<{
      streamType: DifficultStreamType;
      massKg: number;
    }>;
  }): StreamEvaluationResult {
    const totalMass = Math.max(1, params.totalLoadMassKg);
    const breachedStreams: StreamEvaluationResult['breachedStreams'] = [];
    const preTreatments: string[] = [];

    params.streams.forEach((s) => {
      const sharePct = Math.round((s.massKg / totalMass) * 100);
      const rule = this.rules[s.streamType];
      if (rule) {
        if (sharePct > rule.maxSharePct) {
          breachedStreams.push({
            streamType: s.streamType,
            actualSharePct: sharePct,
            maxAllowedSharePct: rule.maxSharePct,
            riskCategory: rule.riskCategory,
          });
        }
        rule.preTreatmentsRequired.forEach((pt) => {
          if (!preTreatments.includes(pt)) preTreatments.push(pt);
        });
      }
    });

    const isLoadAcceptable = breachedStreams.length === 0;

    let sourceFeedbackMessageHindi = '';
    if (!isLoadAcceptable) {
      const topBreach = breachedStreams[0];
      sourceFeedbackMessageHindi = `कचरा सीमा से अधिक: आज के लोड में ${topBreach.streamType} का अनुपात ${topBreach.actualSharePct}% रहा (अधिकतम अनुमेय: ${topBreach.maxAllowedSharePct}%). कृपया रसोई/सोर्स पर इसे अलग रखें। [NEEDS-NATIVE-REVIEW]`;
    } else {
      sourceFeedbackMessageHindi = 'कचरा मिश्रण स्वीकार्य सीमाओं के अंदर है। आवश्यक पूर्व-उपचार लागू किए जा रहे हैं। [NEEDS-NATIVE-REVIEW]';
    }

    return {
      isLoadAcceptable,
      breachedStreams,
      mandatoryPreTreatmentsHindi: preTreatments,
      sourceFeedbackMessageHindi,
    };
  }
}

export const difficultStreamsService = new DifficultStreamsService();
