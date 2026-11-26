/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 15
 * Practice Pit Training Simulator
 * Virtual sandbox for acid crashes, overheating, and cold-starts with debrief replays.
 * [LEARNING-ETHICS] Strictly formative feedback; zero performance ranking or disciplinary usage.
 */

export type ScenarioType = 'COLD_START' | 'ACID_CRASH' | 'OVERHEATING_CORE' | 'MONSOON_MOISTURE_SURGE';

export interface TrainingScenario {
  scenarioId: string;
  type: ScenarioType;
  title: string;
  initialTempC: number;
  initialMoisturePct: number;
  initialPh: number;
  targetTempRangeC: [number, number];
  recommendedActions: string[];
}

export interface SimDecision {
  step: number;
  simDay: number;
  chosenAction: 'ADD_BULKING_DRY' | 'ADD_WATER' | 'TURN_PILE' | 'COVER_TARPAULIN' | 'CALL_SUPERVISOR' | 'DO_NOTHING';
  resultingTempC: number;
  resultingMoisturePct: number;
  resultingPh: number;
  explanation: string;
}

export interface SimRun {
  runId: string;
  traineeUserId: string;
  scenarioId: string;
  decisions: SimDecision[];
  isSuccessfullyRecovered: boolean;
  scorePct: number;
  debriefNotesHindi: string; // [NEEDS-NATIVE-REVIEW]
  debriefNotesEnglish: string;
  completedAt: string;
}
