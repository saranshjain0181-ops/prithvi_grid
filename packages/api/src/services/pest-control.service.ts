import { IPestInspection, PestControl, PestPressureTier } from '../db/models/PestControl.js';
import crypto from 'crypto';

export interface PestEvaluation {
  pestPressureIndex: number;
  pressureTier: PestPressureTier;
  recommendedIntervention: string;
  isHygieneBreach: boolean;
}

export class PestControlService {
  /**
   * Deterministically calculates the Pest Pressure Index (PPI: 0 - 100)
   * based on sticky trap fly counts and visual pest indicators.
   */
  evaluatePestPressure(params: {
    stickyTrapFliesCount: number;
    pestObservations: string[]; // e.g. ['MAGGOTS_CORE', 'RODENT_BURROWS', 'STRAY_ANIMALS', 'COCKROACHES', 'ANT_COLONIES']
  }): PestEvaluation {
    // Weightings:
    // Flies on sticky trap: 0.2 points per fly (50 flies = 10 pts, 200 flies = 40 pts)
    const flyPoints = Math.min(40, params.stickyTrapFliesCount * 0.2);

    // Severe pest observations:
    let observationPoints = 0;
    const obsSet = new Set(params.pestObservations);

    if (obsSet.has('RODENT_BURROWS')) observationPoints += 25;
    if (obsSet.has('STRAY_ANIMALS')) observationPoints += 20;
    if (obsSet.has('MAGGOTS_CORE')) observationPoints += 15;
    if (obsSet.has('COCKROACHES')) observationPoints += 10;
    if (obsSet.has('ANT_COLONIES')) observationPoints += 10;

    const rawIndex = Math.round(flyPoints + observationPoints);
    const pestPressureIndex = Math.min(100, Math.max(0, rawIndex));

    let pressureTier: PestPressureTier = 'LOW';
    let recommendedIntervention = '';

    if (pestPressureIndex >= 75) {
      pressureTier = 'CRITICAL';
      recommendedIntervention = 'तत्काल जैविक नियंत्रण आवश्यक! 2% नीम तेल का छिड़काव करें, चारों तरफ यांत्रिक जाली (mesh barrier) लगाएँ और पेस्‍ट कंट्रोल वेंडर को बुलाएँ। [NEEDS-NATIVE-REVIEW]';
    } else if (pestPressureIndex >= 50) {
      pressureTier = 'HIGH';
      recommendedIntervention = 'उच्च कीट दबाव। सभी गड्ढों पर तिरपाल कसकर बाँधें, सतह पर सूखा कार्बन (लकड़ी की राख/भूसा) डालें ताकि नमी ढँक जाए। [NEEDS-NATIVE-REVIEW]';
    } else if (pestPressureIndex >= 25) {
      pressureTier = 'MODERATE';
      recommendedIntervention = 'मध्यम कीट गतिविधि। स्टिकी ट्रैप बदलें और कचरा गिराने वाले रास्तों को साफ करें। [NEEDS-NATIVE-REVIEW]';
    } else {
      pressureTier = 'LOW';
      recommendedIntervention = 'कीट नियंत्रण उत्कृष्ट एवं सामान्य सीमा के भीतर है। [NEEDS-NATIVE-REVIEW]';
    }

    return {
      pestPressureIndex,
      pressureTier,
      recommendedIntervention,
      isHygieneBreach: pestPressureIndex >= 50,
    };
  }

  /**
   * Records a pest inspection in db
   */
  async recordInspection(params: {
    entityId: string;
    facilityId: string;
    inspectorId: string;
    inspectionDate: string;
    stickyTrapFliesCount: number;
    pestObservations: string[];
    actionTaken?: string;
    bioApprovedPesticideUsed?: string;
    vendorVisitLogged?: boolean;
  }): Promise<{ inspection: IPestInspection; evaluation: PestEvaluation }> {
    const inspectionId = `PEST-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const evaluation = this.evaluatePestPressure({
      stickyTrapFliesCount: params.stickyTrapFliesCount,
      pestObservations: params.pestObservations,
    });

    const inspection = await PestControl.create({
      inspectionId,
      entityId: params.entityId,
      facilityId: params.facilityId,
      inspectorId: params.inspectorId,
      inspectionDate: params.inspectionDate,
      stickyTrapFliesCount: params.stickyTrapFliesCount,
      pestObservations: params.pestObservations,
      pestPressureIndex: evaluation.pestPressureIndex,
      pressureTier: evaluation.pressureTier,
      actionTaken: params.actionTaken,
      bioApprovedPesticideUsed: params.bioApprovedPesticideUsed,
      vendorVisitLogged: params.vendorVisitLogged || false,
      notes: evaluation.recommendedIntervention,
    });

    return { inspection, evaluation };
  }
}

export const pestControlService = new PestControlService();
