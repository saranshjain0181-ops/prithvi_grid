/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 16
 * Shift Huddle Briefing Generator
 * Structured 3-5 minute spoken shift kickoff, weather heat guard, rotating safety focus, and polls.
 * [NEEDS-NATIVE-REVIEW] Spoken Hindi vernacular phrases.
 */

export interface HuddleBrief {
  briefId: string;
  facilityId: string;
  shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  generatedDate: string;
  topTasks: string[];
  pitsToWatch: { pitId: string; reason: string }[];
  weatherHeatAdvice: string;
  safetyFocusTopic: string;
  nearMissReminder?: string;
  spokenScriptHindi: string; // [NEEDS-NATIVE-REVIEW]
  spokenScriptEnglish: string;
  pollQuestion: string;
}

export interface HuddleExecution {
  executionId: string;
  briefId: string;
  conductedByUserId: string;
  attendanceUserIds: string[];
  pollResults: { yesCount: number; noCount: number };
  durationMinutes: number;
  workerQuestionsRaised: string[];
  conductedAt: string;
}
