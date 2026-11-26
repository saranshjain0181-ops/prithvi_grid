import { ICommerceSignal } from '../db/models/CompostCommerceCockpit.js';

export interface CompostCommerceEvaluationResult {
  readyCompostStockMt: number;
  gradeAStockMt: number;
  gradeBStockMt: number;
  bookedOrdersMt: number;
  grossMarginPct: number;
  activeSignals: ICommerceSignal[];
  advisoryHindi: string;
}

export class CompostCommerceService {
  /**
   * Deterministically ties compost stock, market orders, gross margin and inventory signals together
   */
  evaluateCommerceHealth(params: {
    gradeAStockMt: number;
    gradeBStockMt: number;
    bookedOrdersMt: number;
    unitCostPerKgInr: number;
    realisedAveragePricePerKgInr: number;
    ageingLotsCount?: number;
  }): CompostCommerceEvaluationResult {
    const readyStock = params.gradeAStockMt + params.gradeBStockMt;
    const price = Math.max(1, params.realisedAveragePricePerKgInr);
    const cost = Math.max(0, params.unitCostPerKgInr);

    const grossMarginPct = Math.round(((price - cost) / price) * 100 * 10) / 10;

    const activeSignals: ICommerceSignal[] = [];

    // 1. Stockout Risk
    if (params.bookedOrdersMt > readyStock) {
      activeSignals.push({
        signalType: 'STOCKOUT_RISK',
        severity: 'CRITICAL',
        recommendedActionHindi: `स्टॉक की कमी: बुक किए गए ऑर्डर (${params.bookedOrdersMt} MT) तैयार स्टॉक (${readyStock} MT) से अधिक हैं। हार्वेस्ट विंडो त्वरित करें। [NEEDS-NATIVE-REVIEW]`,
      });
    }

    // 2. Overstock Risk
    if (readyStock > params.bookedOrdersMt + 15) {
      activeSignals.push({
        signalType: 'OVERSTOCK_RISK',
        severity: 'ROUTINE',
        recommendedActionHindi: `अतिरिक्त इन्वेंट्री (${readyStock} MT): नए खरीदारों के साथ अग्रिम आरक्षण या प्रचारक छूट प्रस्तावित करें। [NEEDS-NATIVE-REVIEW]`,
      });
    }

    // 3. Ageing Lot Risk
    if (params.ageingLotsCount && params.ageingLotsCount > 0) {
      activeSignals.push({
        signalType: 'AGEING_LOT_RISK',
        severity: 'ELEVATED',
        recommendedActionHindi: `${params.ageingLotsCount} बैच 45 दिन से अधिक पुराने हैं। गुणवत्ता ह्रास से पूर्व तत्काल डिस्पैच करें। [NEEDS-NATIVE-REVIEW]`,
      });
    }

    let advisoryHindi = '';
    if (activeSignals.some((s) => s.severity === 'CRITICAL')) {
      advisoryHindi = 'वाणिज्यिक अलर्ट: तत्काल स्टॉक प्रबंधन आवश्यक। [NEEDS-NATIVE-REVIEW]';
    } else {
      advisoryHindi = `वाणिज्यिक स्वास्थ्य स्थिर: कुल तैयार खाद ${readyStock} MT, सकल मार्जिन ${grossMarginPct}%. [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      readyCompostStockMt: readyStock,
      gradeAStockMt: params.gradeAStockMt,
      gradeBStockMt: params.gradeBStockMt,
      bookedOrdersMt: params.bookedOrdersMt,
      grossMarginPct,
      activeSignals,
      advisoryHindi,
    };
  }
}

export const compostCommerceService = new CompostCommerceService();
