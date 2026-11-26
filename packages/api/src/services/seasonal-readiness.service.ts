import { IChecklistItem, SeasonType } from '../db/models/SeasonalReadiness.js';

export interface SeasonalReadinessEvaluation {
  season: SeasonType;
  totalItems: number;
  mandatoryItems: number;
  passedItems: number;
  failedMandatoryCount: number;
  readinessScorePct: number;
  isClearedForSeason: boolean;
  verdictHindi: string;
  urgentActionItems: string[];
}

export class SeasonalReadinessService {
  /**
   * Generates seasonal checklist template
   */
  getTemplateForSeason(season: SeasonType): IChecklistItem[] {
    switch (season) {
      case 'MONSOON':
        return [
          {
            itemId: 'MON-01',
            category: 'DRAINAGE',
            title: 'बारिश के पानी की नालियां (Stormwater drains) साफ और गाद-मुक्त हैं।',
            isMandatory: true,
            status: 'PENDING',
          },
          {
            itemId: 'MON-02',
            category: 'COVERS',
            title: 'सभी ढ़ेर के तिरपाल में सुराख नहीं हैं और रस्सियों के आईलेट सुरक्षित हैं।',
            isMandatory: true,
            status: 'PENDING',
          },
          {
            itemId: 'MON-03',
            category: 'DRAINAGE',
            title: 'लीचेट संप पंप (Leachate sump pump) का परीक्षण पूर्ण और स्टैंडबाय तैयार है।',
            isMandatory: true,
            status: 'PENDING',
          },
          {
            itemId: 'MON-04',
            category: 'DRAINAGE',
            title: 'सूखे पत्तों व भूसे (dry carbon) के गोदाम में पानी टपकने की कोई संभावना नहीं है।',
            isMandatory: false,
            status: 'PENDING',
          },
        ];
      case 'PEAK_SUMMER':
        return [
          {
            itemId: 'SUM-01',
            category: 'FIRE_SAFETY',
            title: 'रेत की बाल्टियां और चालू पानी के होज़पाइप यार्ड के पास तैयार हैं।',
            isMandatory: true,
            status: 'PENDING',
          },
          {
            itemId: 'SUM-02',
            category: 'MOISTURE',
            title: 'सूखने से बचाने के लिए पानी छिड़कने का समय सुबह 6-8 बजे निर्धारित है।',
            isMandatory: true,
            status: 'PENDING',
          },
          {
            itemId: 'SUM-03',
            category: 'COVERS',
            title: 'सूखे पत्तों की 10cm मोटी टोपी (dry mulch cap) सभी सक्रिय ढेरों पर मौजूद है।',
            isMandatory: true,
            status: 'PENDING',
          },
        ];
      case 'WINTER':
        return [
          {
            itemId: 'WIN-01',
            category: 'INSULATION',
            title: 'अत्यधिक ठंड में गर्मी रुकने हेतु शीर्ष इंसुलेशन टोपी लगाई गई है।',
            isMandatory: true,
            status: 'PENDING',
          },
          {
            itemId: 'WIN-02',
            category: 'MOISTURE',
            title: 'अत्यधिक नमी व ठंडा होने से बचाने हेतु पानी की मात्रा 20% घटाई गई है।',
            isMandatory: false,
            status: 'PENDING',
          },
        ];
      default:
        return [];
    }
  }

  /**
   * Deterministically evaluates seasonal audit checklist
   */
  evaluateReadiness(params: {
    season: SeasonType;
    items: IChecklistItem[];
  }): SeasonalReadinessEvaluation {
    const totalItems = params.items.length;
    const mandatoryItems = params.items.filter((i) => i.isMandatory).length;
    const passedItems = params.items.filter((i) => i.status === 'PASS').length;
    const failedMandatoryItems = params.items.filter((i) => i.isMandatory && i.status === 'FAIL');

    const readinessScorePct = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;
    const isClearedForSeason = readinessScorePct >= 80 && failedMandatoryItems.length === 0;

    const urgentActionItems = failedMandatoryItems.map((i) => i.title);

    let verdictHindi = '';
    if (isClearedForSeason) {
      verdictHindi = `यार्ड ${params.season} मौसम के लिए पूर्णतः तैयार है (Readiness: ${readinessScorePct}%). सभी आवश्यक सुरक्षा जांचें सफल रहीं। [NEEDS-NATIVE-REVIEW]`;
    } else {
      verdictHindi = `सावधान: यार्ड ${params.season} मौसम की तैयारी में अपूर्ण है (${failedMandatoryItems.length} अनिवार्य कार्य लंबित/असफल). तत्काल सुधारात्मक कदम उठाएं। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      season: params.season,
      totalItems,
      mandatoryItems,
      passedItems,
      failedMandatoryCount: failedMandatoryItems.length,
      readinessScorePct,
      isClearedForSeason,
      verdictHindi,
      urgentActionItems,
    };
  }
}

export const seasonalReadinessService = new SeasonalReadinessService();
