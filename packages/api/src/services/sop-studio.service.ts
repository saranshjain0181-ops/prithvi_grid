import { ISopDocument, ISopStep, SopCategory, SopStudio } from '../db/models/SopStudio.js';
import crypto from 'crypto';

export interface AdherenceEvaluation {
  isAdherent: boolean;
  adherencePercentage: number;
  missingSteps: number[];
  durationRatio: number;
  evaluationNotes: string;
}

export class SopStudioService {
  /**
   * Deterministically evaluates task execution adherence against active SOP specification
   */
  evaluateAdherence(params: {
    sopSteps: ISopStep[];
    executedStepIndices: number[];
    actualDurationMinutes: number;
  }): AdherenceEvaluation {
    const totalSteps = params.sopSteps.length;
    if (totalSteps === 0) {
      return {
        isAdherent: true,
        adherencePercentage: 100,
        missingSteps: [],
        durationRatio: 1.0,
        evaluationNotes: 'No steps defined in SOP.',
      };
    }

    const executedSet = new Set(params.executedStepIndices);
    const missingSteps: number[] = [];

    for (const step of params.sopSteps) {
      if (!executedSet.has(step.stepIndex)) {
        missingSteps.push(step.stepIndex);
      }
    }

    const adherencePercentage = Math.round(((totalSteps - missingSteps.length) / totalSteps) * 100);
    const expectedMinutes = params.sopSteps.reduce((acc, s) => acc + s.estimatedMinutes, 0);
    const durationRatio = expectedMinutes > 0 ? Math.round((params.actualDurationMinutes / expectedMinutes) * 100) / 100 : 1.0;

    // Must complete >= 80% of steps and spend at least 50% of expected duration
    const isAdherent = adherencePercentage >= 80 && durationRatio >= 0.5;

    let evaluationNotes = '';
    if (isAdherent) {
      evaluationNotes = `मानक प्रक्रिया (SOP) का ${adherencePercentage}% पालन किया गया। कार्य संतोषजनक है। [NEEDS-NATIVE-REVIEW]`;
    } else {
      evaluationNotes = `SOP का अपर्याप्त पालन (${adherencePercentage}%)। चरण ${missingSteps.join(', ')} छूटे हुए हैं या कार्य बहुत जल्दी समाप्त हुआ। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      isAdherent,
      adherencePercentage,
      missingSteps,
      durationRatio,
      evaluationNotes,
    };
  }

  /**
   * Authors a new SOP or increments version of an existing SOP
   */
  async authorSop(params: {
    sopId?: string;
    entityId: string;
    title: string;
    category: SopCategory;
    purpose: string;
    scope: string;
    steps: ISopStep[];
    approvedBy?: string;
  }): Promise<ISopDocument> {
    const sopId = params.sopId || `SOP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Find highest version
    const latest = await SopStudio.findOne({ sopId }).sort({ version: -1 });
    const version = latest ? latest.version + 1 : 1;

    // Archive previous version if it was ACTIVE
    if (latest && latest.status === 'ACTIVE') {
      latest.status = 'SUPERSEDED';
      await latest.save();
    }

    const sop = await SopStudio.create({
      sopId,
      entityId: params.entityId,
      title: params.title,
      category: params.category,
      version,
      purpose: params.purpose,
      scope: params.scope,
      steps: params.steps,
      status: params.approvedBy ? 'ACTIVE' : 'DRAFT',
      approvedBy: params.approvedBy,
      approvedAt: params.approvedBy ? new Date() : undefined,
    });

    return sop;
  }
}

export const sopStudioService = new SopStudioService();
