import { ICaseRecord } from '../db/models/CaseLibrary.js';

export interface SimilarCaseMatch {
  caseId: string;
  title: string;
  similarityScorePct: number;
  recoveryActionsTaken: string[];
  recoveryDurationHours: number;
  keyLessonLearnedHindi: string;
}

export interface CaseFinderResult {
  matchesCount: number;
  topMatches: SimilarCaseMatch[];
  recommendedProvenActionHindi?: string;
  averageRecoveryDurationHours: number;
}

export class CaseLibraryService {
  /**
   * Deterministically searches the validated case library to find proven recovery interventions
   */
  findSimilarCases(params: {
    incidentType: string;
    pitArchetype?: string;
    currentSymptoms: string[];
    storedCases: Array<{
      caseId: string;
      title: string;
      incidentType: string;
      pitArchetype: string;
      symptoms: string[];
      recoveryActionsTaken: string[];
      recoveryDurationHours: number;
      isValidatedByAgronomist: boolean;
      keyLessonLearnedHindi: string;
    }>;
  }): CaseFinderResult {
    const validatedOnly = params.storedCases.filter((c) => c.isValidatedByAgronomist);
    const matches: SimilarCaseMatch[] = [];

    validatedOnly.forEach((c) => {
      let score = 0;
      if (c.incidentType === params.incidentType) score += 50;
      if (params.pitArchetype && c.pitArchetype === params.pitArchetype) score += 20;

      // Symptom overlap count
      const matchedSymptoms = params.currentSymptoms.filter((s) =>
        c.symptoms.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
      );
      score += matchedSymptoms.length * 15;

      const similarityScorePct = Math.min(100, score);
      if (similarityScorePct >= 50) {
        matches.push({
          caseId: c.caseId,
          title: c.title,
          similarityScorePct,
          recoveryActionsTaken: c.recoveryActionsTaken,
          recoveryDurationHours: c.recoveryDurationHours,
          keyLessonLearnedHindi: c.keyLessonLearnedHindi,
        });
      }
    });

    matches.sort((a, b) => b.similarityScorePct - a.similarityScorePct);
    const topMatches = matches.slice(0, 3);

    const avgRecovery = topMatches.length > 0
      ? Math.round(topMatches.reduce((acc, m) => acc + m.recoveryDurationHours, 0) / topMatches.length)
      : 0;

    let recommendedProvenActionHindi: string | undefined;
    if (topMatches.length > 0 && topMatches[0].recoveryActionsTaken.length > 0) {
      recommendedProvenActionHindi = `समान मामलों में सिद्ध उपाय: ${topMatches[0].recoveryActionsTaken.join(', ')}. (औसत सुधार समय: ${avgRecovery} घंटे). [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      matchesCount: topMatches.length,
      topMatches,
      recommendedProvenActionHindi,
      averageRecoveryDurationHours: avgRecovery,
    };
  }
}

export const caseLibraryService = new CaseLibraryService();
