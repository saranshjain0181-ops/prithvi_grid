import { ITurningSession, TurningStepId, TurningSession } from '../db/models/TurningSession.js';
import crypto from 'crypto';

export interface TurningEvaluation {
  qualityScore: number;
  qualityTier: 'EXCELLENT' | 'ADEQUATE' | 'INCOMPLETE';
  stepsCompletedCount: number;
  stepsMissing: TurningStepId[];
  isAdequatelyAerated: boolean;
  coachFeedback: string;
}

const ALL_STEPS: TurningStepId[] = [
  'OUTER_LAYER_PEELED',
  'CORE_EXPOSED',
  'CENTRE_EXCHANGED',
  'PILE_RESTACKED_CONICAL',
  'MOISTURE_INSPECTED',
];

const STEP_WEIGHTS: Record<TurningStepId, number> = {
  OUTER_LAYER_PEELED: 20,
  CORE_EXPOSED: 20,
  CENTRE_EXCHANGED: 30,
  PILE_RESTACKED_CONICAL: 20,
  MOISTURE_INSPECTED: 10,
};

export class PalatnaCoachService {
  /**
   * Deterministically calculates turning quality score (0-100) and coaching feedback
   */
  evaluateTurningQuality(params: {
    stepsCompleted: TurningStepId[];
    durationSeconds: number;
    telemetryDropConfirmed?: boolean;
  }): TurningEvaluation {
    let score = 0;
    const completedSet = new Set(params.stepsCompleted);

    for (const step of ALL_STEPS) {
      if (completedSet.has(step)) {
        score += STEP_WEIGHTS[step];
      }
    }

    // Penalty if completed in under 5 minutes (< 300 seconds) - human rushed turning
    if (params.durationSeconds < 300) {
      score = Math.max(0, score - 25);
    }

    // Bonus for confirmed physical sensor signature (core temp dip during turning)
    if (params.telemetryDropConfirmed) {
      score = Math.min(100, score + 5);
    }

    const stepsMissing = ALL_STEPS.filter((s) => !completedSet.has(s));

    let qualityTier: 'EXCELLENT' | 'ADEQUATE' | 'INCOMPLETE' = 'INCOMPLETE';
    if (score >= 80) {
      qualityTier = 'EXCELLENT';
    } else if (score >= 60) {
      qualityTier = 'ADEQUATE';
    }

    let coachFeedback = '';
    if (qualityTier === 'EXCELLENT') {
      coachFeedback = 'उत्कृष्ट पलटाई! ढेर के केंद्र और बाहरी परतों का सही आदान-प्रदान हुआ है। ऑक्सीजन स्तर बहाल हो गया है। [NEEDS-NATIVE-REVIEW]';
    } else if (qualityTier === 'ADEQUATE') {
      coachFeedback = 'संतोषजनक पलटाई। अगली बार सुनिश्चित करें कि सभी 5 चरण पूरे हों और ढेर को शंकु (कॉनिकल) आकार में फिर से व्यवस्थित किया जाए। [NEEDS-NATIVE-REVIEW]';
    } else {
      coachFeedback = 'अधूरी पलटाई। कोर का आदान-प्रदान नहीं हुआ या समय बहुत कम था। एनारोबिक बदबू का जोखिम बना हुआ है। [NEEDS-NATIVE-REVIEW]';
    }

    return {
      qualityScore: score,
      qualityTier,
      stepsCompletedCount: params.stepsCompleted.length,
      stepsMissing,
      isAdequatelyAerated: score >= 60,
      coachFeedback,
    };
  }

  /**
   * Persists turning session into db
   */
  async recordTurningSession(params: {
    entityId: string;
    facilityId: string;
    pitId: string;
    workerId: string;
    durationSeconds: number;
    stepsCompleted: TurningStepId[];
    telemetryDropConfirmed?: boolean;
    audioLanguage?: 'hi' | 'hinglish' | 'en';
  }) {
    const sessionId = `TURN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const evaluation = this.evaluateTurningQuality({
      stepsCompleted: params.stepsCompleted,
      durationSeconds: params.durationSeconds,
      telemetryDropConfirmed: params.telemetryDropConfirmed,
    });

    const record = await TurningSession.create({
      sessionId,
      entityId: params.entityId,
      facilityId: params.facilityId,
      pitId: params.pitId,
      workerId: params.workerId,
      startedAt: new Date(Date.now() - params.durationSeconds * 1000),
      endedAt: new Date(),
      durationSeconds: params.durationSeconds,
      stepsCompleted: params.stepsCompleted,
      turningQualityScore: evaluation.qualityScore,
      qualityTier: evaluation.qualityTier,
      audioLanguage: params.audioLanguage || 'hi',
      telemetryDropConfirmed: params.telemetryDropConfirmed || false,
      notes: evaluation.coachFeedback,
    });

    return { record, evaluation };
  }
}

export const palatnaCoachService = new PalatnaCoachService();
