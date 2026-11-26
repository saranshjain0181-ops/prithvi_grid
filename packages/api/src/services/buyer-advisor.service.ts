import { CropProfile, ApplicationGuidance } from '../db/models/BuyerAdvisor';

export class BuyerAdvisorService {
  private cropProfiles: Map<string, CropProfile> = new Map();

  constructor() {
    this.seedCropProfiles();
  }

  private seedCropProfiles(): void {
    const profiles: CropProfile[] = [
      {
        cropId: 'CROP-SEEDLING',
        name: 'Delicate Seedling Trays & Nursery Plugs',
        category: 'SEEDLING_TRAY',
        maxConductivityDsPerM: 1.8,
        recommendedPottingMixRatioPct: 15,
        cautions: [
          'High electrical conductivity will scorch tender radical roots.',
          'Always dilute with coco peat or soil if conductivity exceeds 1.5 dS/m.',
        ],
      },
      {
        cropId: 'CROP-VEG-BED',
        name: 'Vegetable Garden Beds (Tomatoes, Greens)',
        category: 'VEGETABLE_BED',
        recommendedRateKgPerSqm: [2.5, 4.0],
        maxConductivityDsPerM: 3.5,
        recommendedPottingMixRatioPct: 25,
        cautions: ['Incorporate into top 10 cm of soil 5 days prior to transplanting.'],
      },
      {
        cropId: 'CROP-FRUIT-TREE',
        name: 'Fruit Trees & Orchard Basins',
        category: 'FRUIT_TREES',
        recommendedRateGramsPerPlant: [3000, 6000],
        maxConductivityDsPerM: 4.5,
        recommendedPottingMixRatioPct: 30,
        cautions: ['Apply around drip line; keep 15 cm clear of main tree trunk.'],
      },
    ];

    profiles.forEach((p) => this.cropProfiles.set(p.cropId, p));
  }

  public evaluateGuidance(params: {
    lotNumber: string;
    cropId: string;
    measuredLotConductivityDsPerM: number;
    measuredLotPh: number;
    hasLabVerifiedNutrientReport: boolean;
  }): ApplicationGuidance {
    const crop = this.cropProfiles.get(params.cropId);
    if (!crop) throw new Error(`Crop profile ${params.cropId} not found`);

    const guidanceId = `GUIDE-${params.lotNumber}-${params.cropId}`;
    const claimsGatePassed = params.hasLabVerifiedNutrientReport;

    const isConductivityHigh = params.measuredLotConductivityDsPerM > crop.maxConductivityDsPerM;
    const isSuitabilityMet = !isConductivityHigh;

    let doseDisplay = '';
    if (crop.recommendedRateKgPerSqm) {
      doseDisplay = `${crop.recommendedRateKgPerSqm[0]} - ${crop.recommendedRateKgPerSqm[1]} kg per sq.m`;
    } else if (crop.recommendedRateGramsPerPlant) {
      doseDisplay = `${crop.recommendedRateGramsPerPlant[0] / 1000} - ${crop.recommendedRateGramsPerPlant[1] / 1000} kg per plant`;
    } else {
      doseDisplay = `${crop.recommendedPottingMixRatioPct}% blend with potting soil`;
    }

    let enText = `Apply at ${doseDisplay}. Soil pH buffer is ${params.measuredLotPh.toFixed(1)}.`;
    let hiText = `मात्रा: ${doseDisplay}। मिट्टी का पीएच संतुलन ${params.measuredLotPh.toFixed(1)} है।`;

    if (isConductivityHigh) {
      enText = `CAUTION: Lot conductivity (${params.measuredLotConductivityDsPerM.toFixed(1)} dS/m) exceeds seedling safety limit (${crop.maxConductivityDsPerM} dS/m). Dilute to <= 10% mix or use for mature potted plants.`;
      hiText = `सावधानी: खाद में लवणता (${params.measuredLotConductivityDsPerM.toFixed(1)} dS/m) नाजुक पौध के लिए अधिक है। केवल 10% से कम अनुपात में मिलाएं या बड़े पौधों में उपयोग करें।`;
    }

    return {
      guidanceId,
      lotNumber: params.lotNumber,
      cropId: params.cropId,
      measuredLotConductivity: params.measuredLotConductivityDsPerM,
      measuredLotPh: params.measuredLotPh,
      isSuitabilityMet,
      recommendedDoseDisplay: doseDisplay,
      advisoryTextHindi: hiText,
      advisoryTextEnglish: enText,
      dilutionRequired: isConductivityHigh,
      alternativeRecommendedCrop: isConductivityHigh ? 'CROP-VEG-BED' : undefined,
      claimsGatePassed,
    };
  }
}
