import { CompostingPhase } from '../db/models/PhaseProfile.js';
import {
  IBiologyNeedsItem,
  IPitSwimlaneItem,
} from '../db/models/BioprocessControlBoard.js';

export interface BioprocessBoardComposition {
  asOfDate: string;
  swimlane: IPitSwimlaneItem[];
  needsNow: IBiologyNeedsItem[];
  pipelineCounts: {
    loadingCount: number;
    thermophilicCount: number;
    coolingCount: number;
    curingCount: number;
    readyCount: number;
  };
  qualitySummary: {
    batchesWithStrongThermalEvidence: number;
    batchesReadyForHarvest: number;
    storedLotsAtNitrogenRisk: number;
  };
  overallBiologicalHealthScorePct: number;
  advisoryHindi: string;
}

export class BioprocessBoardService {
  /**
   * Deterministically composes the 5-panel Bioprocess Control Board
   */
  composeBoard(params: {
    asOfDate: string;
    pits: Array<{
      pitId: string;
      batchId: string;
      phase: CompostingPhase;
      daysActive: number;
      coreTempC: number;
      moisturePct?: number;
      isOffTrajectory?: boolean;
      phValue?: number;
      thermalEvidenceStrength?: 'STRONG' | 'MODERATE' | 'WEAK';
      isReadyForHarvest?: boolean;
    }>;
    storedLotsAtRiskCount?: number;
  }): BioprocessBoardComposition {
    const swimlane: IPitSwimlaneItem[] = [];
    const needsNow: IBiologyNeedsItem[] = [];

    const pipelineCounts = {
      loadingCount: 0,
      thermophilicCount: 0,
      coolingCount: 0,
      curingCount: 0,
      readyCount: 0,
    };

    let strongThermalCount = 0;
    let readyHarvestCount = 0;

    params.pits.forEach((p) => {
      // 1. Pipeline classification
      switch (p.phase) {
        case 'LOADING_INITIATION':
          pipelineCounts.loadingCount++;
          break;
        case 'THERMOPHILIC':
          pipelineCounts.thermophilicCount++;
          break;
        case 'COOLING_TRANSITION':
          pipelineCounts.coolingCount++;
          break;
        case 'CURING_MATURATION':
          pipelineCounts.curingCount++;
          break;
        case 'STABLE_READY':
        case 'STORED':
          pipelineCounts.readyCount++;
          break;
      }

      if (p.thermalEvidenceStrength === 'STRONG') strongThermalCount++;
      if (p.isReadyForHarvest) readyHarvestCount++;

      // 2. Trajectory determination
      let trajectoryStatus: 'ON_TRACK' | 'RUNNING_COOL' | 'RUNNING_HOT' | 'OFF_TRAJECTORY' = 'ON_TRACK';
      if (p.isOffTrajectory) {
        trajectoryStatus = 'OFF_TRAJECTORY';
      } else if (p.phase === 'THERMOPHILIC' && p.coreTempC > 65) {
        trajectoryStatus = 'RUNNING_HOT';
      } else if (p.phase === 'THERMOPHILIC' && p.coreTempC < 50) {
        trajectoryStatus = 'RUNNING_COOL';
      }

      const expectedHarvestDays = Math.max(1, 45 - p.daysActive);

      swimlane.push({
        pitId: p.pitId,
        batchId: p.batchId,
        phase: p.phase,
        daysActive: p.daysActive,
        expectedHarvestDays,
        trajectoryStatus,
        confidencePct: p.isOffTrajectory ? 70 : 90,
      });

      // 3. Biology Needs Now mapping
      if (p.phase === 'CURING_MATURATION') {
        needsNow.push({
          pitId: p.pitId,
          actionRequired: 'LEAVE_UNDISTURBED',
          urgency: 'ROUTINE',
          summaryHindi: `${p.pitId}: परिपक्वता अवस्था में है। कवक जाल (fungal mycelium) को न तोड़ें — पलटाई रोकें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`,
        });
      } else if (trajectoryStatus === 'RUNNING_HOT') {
        needsNow.push({
          pitId: p.pitId,
          actionRequired: 'HEAT_SPREAD',
          urgency: 'CRITICAL',
          summaryHindi: `${p.pitId}: कोर का तापमान ${p.coreTempC}°C (अत्यधिक)। ऊपर का ढक्कन खोलें व ऊपरी परत फैलाएं। [NEEDS-NATIVE-REVIEW]`,
        });
      } else if (p.moisturePct && p.moisturePct < 40) {
        needsNow.push({
          pitId: p.pitId,
          actionRequired: 'WATER_ADDITION',
          urgency: 'ELEVATED',
          summaryHindi: `${p.pitId}: नमी 40% से कम। सूक्ष्मजीवों को सक्रिय रखने हेतु पानी छिड़कें। [NEEDS-NATIVE-REVIEW]`,
        });
      }
    });

    const offTrackCount = swimlane.filter((s) => s.trajectoryStatus !== 'ON_TRACK').length;
    const totalPits = params.pits.length;
    const overallBiologicalHealthScorePct = totalPits > 0 
      ? Math.round(((totalPits - offTrackCount) / totalPits) * 100) 
      : 100;

    let advisoryHindi = '';
    if (offTrackCount > 0) {
      advisoryHindi = `यार्ड में ${offTrackCount} गड्ढे जैविक प्रक्षेपवक्र (trajectory) से विचलित हैं। 'Biology Needs Now' के अनुसार सुधारात्मक कार्रवाई करें। [NEEDS-NATIVE-REVIEW]`;
    } else {
      advisoryHindi = `सभी ${totalPits} सक्रिय गड्ढे अपनी जैविक अवस्था के अनुसार सामान्य गति पर हैं। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      asOfDate: params.asOfDate,
      swimlane,
      needsNow,
      pipelineCounts,
      qualitySummary: {
        batchesWithStrongThermalEvidence: strongThermalCount,
        batchesReadyForHarvest: readyHarvestCount,
        storedLotsAtNitrogenRisk: params.storedLotsAtRiskCount || 0,
      },
      overallBiologicalHealthScorePct,
      advisoryHindi,
    };
  }
}

export const bioprocessBoardService = new BioprocessBoardService();
