import { ContaminantType, GateDecision } from '../db/models/ReceivingGate.js';

export interface GateInspectionEvaluation {
  decision: GateDecision;
  isBiomedicalAlert: boolean;
  sortingDurationMinutes: number;
  contaminantWeightKg: number;
  feedbackCardMessage: string;
  sourceScorePenalty: number;
}

export class ReceivingGateService {
  /**
   * Evaluates waste container inspection at receiving bay and formats source feedback
   */
  evaluateGateInspection(params: {
    sourceDepartment: string;
    contaminationLevel: 'NONE' | 'MINOR' | 'MAJOR';
    contaminantsFound: ContaminantType[];
    contaminantWeightKg?: number;
  }): GateInspectionEvaluation {
    const contaminants = new Set(params.contaminantsFound);

    // 1. Biomedical waste is an immediate statutory halt
    if (contaminants.has('SUSPECTED_BIOMEDICAL')) {
      return {
        decision: 'REJECT',
        isBiomedicalAlert: true,
        sortingDurationMinutes: 0,
        contaminantWeightKg: params.contaminantWeightKg || 0,
        feedbackCardMessage: `[CRITICAL-BIOMEDICAL-ALERT] ${params.sourceDepartment} से प्राप्त बिन में संदिग्ध बायोमेडिकल सामग्री पाई गई है। अस्वीकृत कर दिया गया है। संबंधित विभाग प्रमुख तुरंत संज्ञान लें। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`,
        sourceScorePenalty: 50,
      };
    }

    // 2. Major contamination (> 5kg or level MAJOR)
    if (params.contaminationLevel === 'MAJOR' || (params.contaminantWeightKg && params.contaminantWeightKg > 5)) {
      const weight = params.contaminantWeightKg || 6;
      return {
        decision: 'ACCEPT_AFTER_SORTING',
        isBiomedicalAlert: false,
        sortingDurationMinutes: Math.round(weight * 3), // ~3 mins per kg
        contaminantWeightKg: weight,
        feedbackCardMessage: `नमस्ते ${params.sourceDepartment} टीम, आज के गीले कचरे में प्लास्टिक/कटलरी पाई गई (${weight} किग्रा)। कृपया स्रोत पर पृथक्करण (segregation) सुनिश्चित करें ताकि खाद की गुणवत्ता बनी रहे। धन्यवाद! [NEEDS-NATIVE-REVIEW]`,
        sourceScorePenalty: 15,
      };
    }

    // 3. Minor contamination
    if (params.contaminationLevel === 'MINOR') {
      const weight = params.contaminantWeightKg || 1;
      return {
        decision: 'ACCEPT_AFTER_SORTING',
        isBiomedicalAlert: false,
        sortingDurationMinutes: 5,
        contaminantWeightKg: weight,
        feedbackCardMessage: `${params.sourceDepartment}: कचरा स्वीकार कर लिया गया है। कुछ मामूली रैपर अलग किए गए। स्रोत पर ध्यान देने हेतु धन्यवाद। [NEEDS-NATIVE-REVIEW]`,
        sourceScorePenalty: 5,
      };
    }

    // 4. Clean organic waste
    return {
      decision: 'ACCEPT',
      isBiomedicalAlert: false,
      sortingDurationMinutes: 0,
      contaminantWeightKg: 0,
      feedbackCardMessage: `शाबाश ${params.sourceDepartment}! आज 100% शुद्ध गीला कचरा प्राप्त हुआ। आपका सेग्रीगेशन स्कोर 100/100 है। [NEEDS-NATIVE-REVIEW]`,
      sourceScorePenalty: 0,
    };
  }
}

export const receivingGateService = new ReceivingGateService();
