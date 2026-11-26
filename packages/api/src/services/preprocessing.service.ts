import {
  IPreProcessingSessionRecord,
  PreProcessingSession,
  SizeCheckResult,
} from '../db/models/PreProcessingStation.js';

export interface PreProcessingEvaluation {
  allowed: boolean;
  blockReason?: string;
  isSizeCheckPassed: boolean;
  throughputKgPerHour: number;
  moistureReductionPct: number;
  recommendation: string;
  maintenanceAlert?: string;
}

export class PreProcessingService {
  /**
   * Validates safety & certification, evaluates machine throughput and fist-size compliance
   */
  evaluateSession(params: {
    stationType: 'SHREDDER' | 'DEWATERING_PRESS' | 'DEPACKAGING';
    inputMassKg: number;
    outputMassKg: number;
    liquidDrainedLiters?: number;
    runtimeMinutes: number;
    operatorCertified: boolean;
    supervisorOverride?: boolean;
    overrideReason?: string;
    sizeCheck: SizeCheckResult;
  }): PreProcessingEvaluation {
    // 1. Safety Interlock: Operator Certification Gate
    if (!params.operatorCertified && !params.supervisorOverride) {
      return {
        allowed: false,
        blockReason: 'OPERATOR_NOT_CERTIFIED: Operator lacks valid machinery certification. Operation halted pending supervisor override. [LEGAL-REVIEW]',
        isSizeCheckPassed: false,
        throughputKgPerHour: 0,
        moistureReductionPct: 0,
        recommendation: 'प्रमाणित ऑपरेटर से कार्य कराएं या पर्यवेक्षक की स्वीकृति दर्ज करें। [NEEDS-NATIVE-REVIEW]',
      };
    }

    const runtimeHours = params.runtimeMinutes > 0 ? params.runtimeMinutes / 60 : 0.01;
    const throughputKgPerHour = Math.round((params.inputMassKg / runtimeHours) * 10) / 10;
    const liquidDrained = params.liquidDrainedLiters || 0;
    const moistureReductionPct = params.inputMassKg > 0 
      ? Math.round((liquidDrained / params.inputMassKg) * 1000) / 10 
      : 0;

    const isSizeCheckPassed = params.sizeCheck === 'ALL_UNDER_FIST_SIZE';
    let recommendation = 'मुट्ठी के आकार की जांच सफल (All under fist size). सामग्री गड्ढे में डालने हेतु उपयुक्त है। [NEEDS-NATIVE-REVIEW]';
    let maintenanceAlert: string | undefined;

    if (params.sizeCheck === 'FEW_OVER_FIST_SIZE') {
      recommendation = 'कुछ बड़े टुकड़े शेष हैं। 10-15% सामग्री को दोबारा कटर में डालें। [NEEDS-NATIVE-REVIEW]';
    } else if (params.sizeCheck === 'MANY_OVER_FIST_SIZE') {
      recommendation = 'आकार असंतोषजनक (Many over fist size). पूरी खेप को पुनः प्रोसेस करें। [NEEDS-NATIVE-REVIEW]';
      maintenanceAlert = 'ब्लेड का घिसना अथवा क्लीयरेंस गैप बढ़ सकता है। रखरखाव की जांच करें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]';
    }

    return {
      allowed: true,
      isSizeCheckPassed,
      throughputKgPerHour,
      moistureReductionPct,
      recommendation,
      maintenanceAlert,
    };
  }

  /**
   * Helper to persist pre-processing record
   */
  async recordSession(record: {
    sessionId: string;
    facilityId: string;
    stationType: 'SHREDDER' | 'DEWATERING_PRESS' | 'DEPACKAGING';
    inputMassKg: number;
    outputMassKg: number;
    liquidDrainedLiters?: number;
    runtimeMinutes: number;
    operatorId: string;
    operatorCertified: boolean;
    sizeCheck: SizeCheckResult;
    sessionNotes?: string;
  }): Promise<IPreProcessingSessionRecord> {
    const isSizeCheckPassed = record.sizeCheck === 'ALL_UNDER_FIST_SIZE';
    const doc = new PreProcessingSession({
      ...record,
      isSizeCheckPassed,
      liquidDrainedLiters: record.liquidDrainedLiters || 0,
    });
    return doc;
  }
}

export const preProcessingService = new PreProcessingService();
