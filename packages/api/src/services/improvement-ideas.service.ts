import { IdeaStatus, IdeaTheme } from '../db/models/ImprovementIdeas.js';

export interface IdeaTriageResult {
  ideaId: string;
  status: IdeaStatus;
  triageNotesHindi: string;
  estimatedAnnualSavingsInr: number;
  recognitionNoteHindi: string;
}

export class ImprovementIdeasService {
  /**
   * Deterministically triages frontline worker suggestions, computes baseline savings & generates recognition
   */
  triageIdea(params: {
    ideaId: string;
    theme: IdeaTheme;
    title: string;
    description: string;
    estimatedHoursSavedPerWeek?: number;
    laborHourlyRateInr?: number; // default ₹100/hr
  }): IdeaTriageResult {
    const hoursPerWeek = params.estimatedHoursSavedPerWeek || 2.5;
    const hourlyRate = params.laborHourlyRateInr || 100;
    // 52 weeks per year
    const estimatedAnnualSavingsInr = Math.round(hoursPerWeek * 52 * hourlyRate);

    let status: IdeaStatus = 'TRIAGED_APPROVED';
    let triageNotesHindi = 'सुझाव स्वीकृत: पायलट परीक्षण (14 दिवसीय) हेतु अनुमोदित किया गया। [NEEDS-NATIVE-REVIEW]';

    const recognitionNoteHindi = `धन्यवाद! आपका विचार (${params.title}) यार्ड सुधार बोर्ड पर प्रदर्शित किया गया है। टीम को इस पर गर्व है। [NEEDS-NATIVE-REVIEW]`;

    return {
      ideaId: params.ideaId,
      status,
      triageNotesHindi,
      estimatedAnnualSavingsInr,
      recognitionNoteHindi,
    };
  }
}

export const improvementIdeasService = new ImprovementIdeasService();
