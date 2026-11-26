import { CertificationSkill, IWorkerCertificationRecord } from '../db/models/TrainingAcademy.js';

export interface CertificationEvaluation {
  eligible: boolean;
  scorePct: number;
  expiresAt: Date;
  certificateStatus: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'FAILED_PRACTICAL' | 'AUDIO_INCOMPLETE';
  messageHindi: string;
}

export class TrainingAcademyService {
  /**
   * Evaluates worker certification based on audio module and supervisor practical assessment
   */
  evaluateCertificationAttempt(params: {
    skill: CertificationSkill;
    audioModuleCompleted: boolean;
    practicalScorePct: number;
    supervisorSigned: boolean;
    issuedDate?: Date;
  }): CertificationEvaluation {
    const issuedDate = params.issuedDate || new Date();
    const expiresAt = new Date(issuedDate);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year validity

    if (!params.audioModuleCompleted) {
      return {
        eligible: false,
        scorePct: params.practicalScorePct,
        expiresAt,
        certificateStatus: 'AUDIO_INCOMPLETE',
        messageHindi: 'प्रशिक्षण अधूरा: कृपया पहले ऑडियो मॉड्यूल सुनें। [NEEDS-NATIVE-REVIEW]',
      };
    }

    if (params.practicalScorePct < 80) {
      return {
        eligible: false,
        scorePct: params.practicalScorePct,
        expiresAt,
        certificateStatus: 'FAILED_PRACTICAL',
        messageHindi: `प्रायोगिक मूल्यांकन में अंक कम हैं (${params.practicalScorePct}% / न्यूनतम 80% आवश्यक)। पुनः अभ्यास करें। [NEEDS-NATIVE-REVIEW]`,
      };
    }

    if (!params.supervisorSigned) {
      return {
        eligible: false,
        scorePct: params.practicalScorePct,
        expiresAt,
        certificateStatus: 'FAILED_PRACTICAL',
        messageHindi: 'पर्यवेक्षक का भौतिक सत्यापन हस्ताक्षर अनिवार्य है। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]',
      };
    }

    return {
      eligible: true,
      scorePct: params.practicalScorePct,
      expiresAt,
      certificateStatus: 'ACTIVE',
      messageHindi: `बधाई! ${params.skill} कौशल हेतु प्रमाणन 1 वर्ष के लिए वैध स्वीकृत हुआ। [NEEDS-NATIVE-REVIEW]`,
    };
  }

  /**
   * Interlock check for machine dispatch or task assignment
   */
  verifyWorkerGate(cert?: {
    isRevoked: boolean;
    expiresAt: Date;
    practicalAssessmentScorePct: number;
  }): { allowed: boolean; reason?: string } {
    if (!cert) {
      return { allowed: false, reason: 'NO_CERTIFICATION_RECORD_FOUND' };
    }
    if (cert.isRevoked) {
      return { allowed: false, reason: 'CERTIFICATION_REVOKED_FOR_SAFETY_VIOLATION' };
    }
    if (new Date() > new Date(cert.expiresAt)) {
      return { allowed: false, reason: 'CERTIFICATION_EXPIRED_REFRESHER_DUE' };
    }
    if (cert.practicalAssessmentScorePct < 80) {
      return { allowed: false, reason: 'SCORE_BELOW_PASSING_STANDARD' };
    }
    return { allowed: true };
  }
}

export const trainingAcademyService = new TrainingAcademyService();
