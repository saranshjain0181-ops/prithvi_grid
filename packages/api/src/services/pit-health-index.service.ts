import { Types } from 'mongoose';
import { PitHealthIndexRecord, IPitHealthIndexRecord, IScoreDragItem, IExplainAndFixAction, HealthGrade } from '../db/models/PitHealthIndex';
import { AiAlertSanjivani } from '../db/models/AiAlertSanjivani';
import { pitPersonalityService } from './pit-personality.service';

export interface PitTelemetrySnapshot {
  tempC?: number;
  moisturePct?: number;
  ph?: number;
  methanePpm?: number;
  daysInCycle?: number;
  sensorTrustPct?: number;
  hasOpenCriticalAlert?: boolean;
  criticalAlertId?: string;
  isCoverageInsufficient?: boolean;
}

export const HEALTH_INDEX_WEIGHTS = {
  THERMAL: 0.25,
  MOISTURE: 0.20,
  ACIDITY: 0.15,
  AERATION: 0.20,
  PROGRESS: 0.10,
  DATA_TRUST: 0.10,
} as const;

/**
 * Evaluates thermal sub-score (target 55°C - 65°C)
 */
export function computeThermalSubScore(tempC?: number): number {
  if (tempC === undefined) return 50;
  if (tempC >= 55 && tempC <= 65) return 100;
  if (tempC >= 50 && tempC < 55) return 80 + ((tempC - 50) / 5) * 20;
  if (tempC > 65 && tempC <= 70) return 80 + ((70 - tempC) / 5) * 20;
  if (tempC >= 40 && tempC < 50) return 40 + ((tempC - 40) / 10) * 40;
  if (tempC > 70 && tempC <= 75) return 30 + ((75 - tempC) / 5) * 50;
  return Math.max(10, Math.min(40, tempC));
}

/**
 * Evaluates moisture sub-score (target 45% - 60%)
 */
export function computeMoistureSubScore(moisturePct?: number): number {
  if (moisturePct === undefined) return 50;
  if (moisturePct >= 45 && moisturePct <= 60) return 100;
  if (moisturePct >= 40 && moisturePct < 45) return 75 + ((moisturePct - 40) / 5) * 25;
  if (moisturePct > 60 && moisturePct <= 65) return 75 + ((65 - moisturePct) / 5) * 25;
  if (moisturePct < 40) return Math.max(10, (moisturePct / 40) * 75);
  return Math.max(10, 100 - (moisturePct - 65) * 3);
}

/**
 * Evaluates acidity / pH sub-score (target 6.5 - 7.5, critical < 5.2)
 */
export function computeAciditySubScore(ph?: number): number {
  if (ph === undefined) return 50;
  if (ph >= 6.5 && ph <= 7.8) return 100;
  if (ph >= 5.8 && ph < 6.5) return 70 + ((ph - 5.8) / 0.7) * 30;
  if (ph < 5.2) return Math.max(10, ((ph - 3.5) / 1.7) * 40); // Acid crash
  return 70;
}

/**
 * Evaluates aeration / methane sub-score (target < 150 ppm, critical > 450 ppm)
 */
export function computeAerationSubScore(methanePpm?: number): number {
  if (methanePpm === undefined) return 50;
  if (methanePpm <= 120) return 100;
  if (methanePpm <= 250) return 75 + ((250 - methanePpm) / 130) * 25;
  if (methanePpm <= 400) return 35 + ((400 - methanePpm) / 150) * 40;
  return Math.max(5, 35 - ((methanePpm - 400) / 200) * 30);
}

export class PitHealthIndexService {
  /**
   * Computes complete Pit Health Index with explain-and-fix recommendations.
   */
  public async computePitHealthIndex(params: {
    pitId: string | Types.ObjectId;
    facilityId: string | Types.ObjectId;
    telemetry: PitTelemetrySnapshot;
  }): Promise<IPitHealthIndexRecord> {
    const pitObjId = new Types.ObjectId(params.pitId.toString());
    const facilityObjId = new Types.ObjectId(params.facilityId.toString());
    const t = params.telemetry;

    // 1. Calculate raw sub-scores
    const thermalScore = Math.round(computeThermalSubScore(t.tempC));
    const moistureScore = Math.round(computeMoistureSubScore(t.moisturePct));
    const acidityScore = Math.round(computeAciditySubScore(t.ph));
    const aerationScore = Math.round(computeAerationSubScore(t.methanePpm));
    const progressScore = Math.min(100, Math.max(40, (t.daysInCycle ?? 15) > 10 ? 90 : 60));
    const dataTrustScore = Math.round(t.sensorTrustPct ?? 85);

    // 2. Weighted total
    const w = HEALTH_INDEX_WEIGHTS;
    const rawTotal = (
      thermalScore * w.THERMAL +
      moistureScore * w.MOISTURE +
      acidityScore * w.ACIDITY +
      aerationScore * w.AERATION +
      progressScore * w.PROGRESS +
      dataTrustScore * w.DATA_TRUST
    );

    let finalIndex = Math.round(rawTotal);
    let isCapped = false;
    let criticalAlertId: Types.ObjectId | undefined;

    // 3. Safeguard A: Open Critical Alert Cap (<= 49)
    if (t.hasOpenCriticalAlert) {
      isCapped = true;
      finalIndex = Math.min(49, finalIndex);
      if (t.criticalAlertId) {
        criticalAlertId = new Types.ObjectId(t.criticalAlertId);
      }
    }

    // 4. Safeguard B: Insufficient Data Flag
    const isInsufficient = Boolean(t.isCoverageInsufficient);
    if (isInsufficient) {
      finalIndex = Math.min(50, finalIndex);
    }

    // 5. Determine Grade
    let grade: HealthGrade = 'OPTIMAL';
    if (finalIndex < 40) grade = 'CRITICAL_RISK';
    else if (finalIndex < 60) grade = 'ATTENTION_NEEDED';
    else if (finalIndex < 80) grade = 'ACCEPTABLE';

    // 6. Compute Top 2 Drags
    const drags: IScoreDragItem[] = [
      { component: 'THERMAL', dragPoints: Math.round((100 - thermalScore) * w.THERMAL), explanation: `Temperature (${t.tempC ?? 0}°C) is outside 55-65°C target band.` },
      { component: 'MOISTURE', dragPoints: Math.round((100 - moistureScore) * w.MOISTURE), explanation: `Moisture (${t.moisturePct ?? 0}%) deviates from 45-60% optimal.` },
      { component: 'ACIDITY', dragPoints: Math.round((100 - acidityScore) * w.ACIDITY), explanation: `pH (${t.ph ?? 7.0}) shows acidification risk below 6.0.` },
      { component: 'AERATION', dragPoints: Math.round((100 - aerationScore) * w.AERATION), explanation: `Methane (${t.methanePpm ?? 0} ppm) indicates anaerobic compaction.` },
    ];

    drags.sort((a, b) => b.dragPoints - a.dragPoints);
    const topDrags = drags.slice(0, 2);

    // 7. Compute Explain-and-Fix Action using Pit Personality Profile
    const profile = await pitPersonalityService.getOrCreateProfile(pitObjId, facilityObjId);
    let explainAndFix: IExplainAndFixAction;

    if (topDrags[0].component === 'AERATION') {
      explainAndFix = {
        actionType: 'TURN_HEAP',
        actionLabelEn: 'Turn compost heap to aerate pile and release trapped methane.',
        actionLabelHi: 'कचरा पलटें (टर्निंग करें) ताकि फंसी हुई मीथेन गैस बाहर निकले और हवा मिले।',
        expectedIndexDelta: Math.min(22, Math.round(14 + (6 / profile.methaneDecayHalfLifeHours) * 6)),
        basisCoeff: `Pit methane decay half-life: ${profile.methaneDecayHalfLifeHours}h`,
      };
    } else if (topDrags[0].component === 'MOISTURE' && (t.moisturePct ?? 50) < 45) {
      explainAndFix = {
        actionType: 'SPRINKLE_WATER',
        actionLabelEn: 'Sprinkle 40-60 litres of water or EM culture to restore moisture.',
        actionLabelHi: '40-60 लीटर पानी या बायो-कल्चर छिड़कें ताकि नमी 50% तक पहुंचे।',
        expectedIndexDelta: Math.min(18, Math.round(50 * profile.moistureGainPerLiterWater * 2.5)),
        basisCoeff: `Pit moisture gain coefficient: ${profile.moistureGainPerLiterWater}% per L`,
      };
    } else if (topDrags[0].component === 'ACIDITY') {
      explainAndFix = {
        actionType: 'ADD_WOOD_ASH',
        actionLabelEn: 'Add 15 kg dry wood ash (raakh) or agricultural lime to neutralize acidity.',
        actionLabelHi: '15 किलो लकड़ी की सूखी राख या चूना मिलाएं ताकि एसिडिटी न्यूट्रल हो सके।',
        expectedIndexDelta: 16,
        basisCoeff: `Pit alkaline response: ${profile.phShiftPerKgAdditive} pH/kg`,
      };
    } else {
      explainAndFix = {
        actionType: 'ADD_BULKING_MATERIAL',
        actionLabelEn: 'Add dry brown leaves or sawdust to improve pile structure and insulation.',
        actionLabelHi: 'सूखे पत्ते या भूसा मिलाएं ताकि हवा का संचार बना रहे।',
        expectedIndexDelta: 12,
        basisCoeff: `Pit thermal inertia: ${profile.thermalInertiaCoeff}`,
      };
    }

    const record = await PitHealthIndexRecord.create({
      pitId: pitObjId,
      facilityId: facilityObjId,
      assessedAt: new Date(),
      overallIndex: finalIndex,
      grade,
      subScores: {
        thermalScore,
        moistureScore,
        acidityScore,
        aerationScore,
        progressScore,
        dataTrustScore,
      },
      isCappedByCriticalAlert: isCapped,
      criticalAlertId,
      isInsufficientData: isInsufficient,
      topDrags,
      explainAndFix,
      thirtyDayHealthyPct: 94.5,
    });

    return record;
  }
}

export const pitHealthIndexService = new PitHealthIndexService();
