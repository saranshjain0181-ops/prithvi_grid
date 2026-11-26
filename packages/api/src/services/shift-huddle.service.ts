import { HuddleBrief, HuddleExecution } from '../db/models/ShiftHuddle';

export class ShiftHuddleService {
  private briefs: Map<string, HuddleBrief> = new Map();
  private executions: Map<string, HuddleExecution> = new Map();

  public generateBrief(params: {
    facilityId: string;
    shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT';
    topTasks: string[];
    pitsToWatch: { pitId: string; reason: string }[];
    temperatureForecastC: number;
    safetyTopicRotation: string;
    nearMissAlert?: string;
  }): HuddleBrief {
    const briefId = `HUD-${params.facilityId}-${Date.now()}`;

    const isHeatWave = params.temperatureForecastC >= 38;
    const heatAdvice = isHeatWave
      ? `High heat alert: Forecast ${params.temperatureForecastC}°C. Take mandatory 10-minute water break every 90 minutes. [EXPERT-REVIEW]`
      : `Moderate weather (${params.temperatureForecastC}°C). Maintain standard hydration.`;

    const hindiTasks = params.topTasks.join(', ');
    const hindiPits = params.pitsToWatch.map((p) => `${p.pitId} (${p.reason})`).join(', ');

    const spokenScriptHindi = `नमस्ते टीम! आज की मुख्य जिम्मेदारियां: ${hindiTasks}। ध्यान देने योग्य गड्ढे: ${hindiPits}। मौसम सलाह: ${heatAdvice}। सुरक्षा नियम: ${params.safetyTopicRotation}। काम सुरक्षित ढंग से करें।`;
    const spokenScriptEnglish = `Good morning team! Today's priorities: ${params.topTasks.join('; ')}. Pits under observation: ${params.pitsToWatch.map((p) => `${p.pitId}: ${p.reason}`).join('; ')}. Weather: ${heatAdvice}. Safety focus: ${params.safetyTopicRotation}.`;

    const brief: HuddleBrief = {
      briefId,
      facilityId: params.facilityId,
      shiftType: params.shiftType,
      generatedDate: new Date().toISOString(),
      topTasks: params.topTasks,
      pitsToWatch: params.pitsToWatch,
      weatherHeatAdvice: heatAdvice,
      safetyFocusTopic: params.safetyTopicRotation,
      nearMissReminder: params.nearMissAlert,
      spokenScriptHindi,
      spokenScriptEnglish,
      pollQuestion: 'क्या आपके कार्य क्षेत्र में पीने का साफ पानी उपलब्ध है?',
    };

    this.briefs.set(briefId, brief);
    return brief;
  }

  public recordExecution(params: {
    briefId: string;
    conductedByUserId: string;
    attendanceUserIds: string[];
    pollResults: { yesCount: number; noCount: number };
    durationMinutes: number;
    workerQuestionsRaised?: string[];
  }): HuddleExecution {
    const executionId = `EXEC-${Date.now()}`;
    const execution: HuddleExecution = {
      executionId,
      briefId: params.briefId,
      conductedByUserId: params.conductedByUserId,
      attendanceUserIds: params.attendanceUserIds,
      pollResults: params.pollResults,
      durationMinutes: params.durationMinutes,
      workerQuestionsRaised: params.workerQuestionsRaised || [],
      conductedAt: new Date().toISOString(),
    };

    this.executions.set(executionId, execution);
    return execution;
  }
}
