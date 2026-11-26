import { ISenseCheckObservations, ISensorComparison, SenseCheck } from '../db/models/SenseCheck.js';
import crypto from 'crypto';

export interface EvaluateSenseCheckInput {
  observations: ISenseCheckObservations;
  sensorCoreTempC?: number;
  sensorMoisturePct?: number;
}

export interface SenseCheckEvaluation {
  tempAgreement: boolean;
  moistureAgreement: boolean;
  driftWarning: boolean;
  biologicalStatusSummary: string;
  notes: string;
}

export class SenseCheckService {
  /**
   * Deterministically evaluates human hand/eye observations against physical sensor readings
   */
  evaluateSenseCheck(input: EvaluateSenseCheckInput): SenseCheckEvaluation {
    const { observations, sensorCoreTempC, sensorMoisturePct } = input;

    let tempAgreement = true;
    let moistureAgreement = true;
    let driftWarning = false;
    const notesArr: string[] = [];

    // 1. Cross-validate core temperature
    if (sensorCoreTempC !== undefined) {
      if (observations.stickHeat === 'BURNING_HOT' && sensorCoreTempC < 45) {
        tempAgreement = false;
        notesArr.push(`Human feels BURNING_HOT (>60°C) but sensor reports ${sensorCoreTempC}°C. Possible RTD probe drift.`);
      } else if (observations.stickHeat === 'COLD' && sensorCoreTempC > 45) {
        tempAgreement = false;
        notesArr.push(`Human feels COLD (<30°C) but sensor reports ${sensorCoreTempC}°C. Possible false heating or sensor disconnection.`);
      }
    }

    // 2. Cross-validate moisture
    if (sensorMoisturePct !== undefined) {
      if (observations.squeezeTest === 'WATER_DRIPS' && sensorMoisturePct < 50) {
        moistureAgreement = false;
        notesArr.push(`Human squeeze yields WATER_DRIPS (>65%) but sensor reports ${sensorMoisturePct}%. Possible capacitive calibration error.`);
      } else if (observations.squeezeTest === 'CRUMBLES_DRY' && sensorMoisturePct > 60) {
        moistureAgreement = false;
        notesArr.push(`Human squeeze shows CRUMBLES_DRY (<45%) but sensor reports ${sensorMoisturePct}%. Possible shorted probe.`);
      }
    }

    if (!tempAgreement || !moistureAgreement) {
      driftWarning = true;
    }

    // 3. Biological status summary
    let biologicalStatusSummary = 'Aerobic heap active.';
    if (observations.smellTest === 'SOUR_VINEGAR') {
      biologicalStatusSummary = 'Acid crash detected from volatile fatty acids. Addition of alkaline buffer recommended.';
    } else if (observations.smellTest === 'ROTTEN_EGG') {
      biologicalStatusSummary = 'Anaerobic core with hydrogen sulfide gas detected. Immediate aeration/turning required.';
    } else if (observations.smellTest === 'AMMONIA') {
      biologicalStatusSummary = 'Nitrogen loss detected. Low C:N ratio; dry carbonaceous bulking needed.';
    }

    return {
      tempAgreement,
      moistureAgreement,
      driftWarning,
      biologicalStatusSummary,
      notes: notesArr.length > 0 ? notesArr.join('; ') : 'Human field observation correlates well with electronic sensors.',
    };
  }

  /**
   * Records a sense check in the database
   */
  async recordSenseCheck(params: {
    entityId: string;
    facilityId: string;
    pitId: string;
    performedBy: string;
    observations: ISenseCheckObservations;
    sensorCoreTempC?: number;
    sensorMoisturePct?: number;
    photoUrl?: string;
  }) {
    const evaluation = this.evaluateSenseCheck({
      observations: params.observations,
      sensorCoreTempC: params.sensorCoreTempC,
      sensorMoisturePct: params.sensorMoisturePct,
    });

    const checkId = `SENSE-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const record = await SenseCheck.create({
      checkId,
      entityId: params.entityId,
      facilityId: params.facilityId,
      pitId: params.pitId,
      performedBy: params.performedBy,
      observations: params.observations,
      sensorComparison: {
        sensorCoreTempC: params.sensorCoreTempC,
        sensorMoisturePct: params.sensorMoisturePct,
        tempAgreement: evaluation.tempAgreement,
        moistureAgreement: evaluation.moistureAgreement,
        driftWarning: evaluation.driftWarning,
        notes: evaluation.notes,
      },
      photoUrl: params.photoUrl,
    });

    return {
      check: record,
      evaluation,
    };
  }
}

export const senseCheckService = new SenseCheckService();
