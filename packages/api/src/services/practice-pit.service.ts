import {
  TrainingScenario,
  SimRun,
  SimDecision,
  ScenarioType,
} from '../db/models/PracticePitSimulator';

export class PracticePitService {
  private scenarios: Map<string, TrainingScenario> = new Map();

  constructor() {
    this.seedScenarios();
  }

  private seedScenarios(): void {
    const defaultScenarios: TrainingScenario[] = [
      {
        scenarioId: 'SCEN-ACID-CRASH',
        type: 'ACID_CRASH',
        title: 'Post-Festival Acid Crash & Anaerobic Odor',
        initialTempC: 38,
        initialMoisturePct: 72,
        initialPh: 4.8,
        targetTempRangeC: [48, 65],
        recommendedActions: ['ADD_BULKING_DRY', 'DO_NOTHING', 'TURN_PILE'],
      },
      {
        scenarioId: 'SCEN-OVERHEAT',
        type: 'OVERHEATING_CORE',
        title: 'Hot Summer Thermophilic Overheating (>68°C)',
        initialTempC: 69,
        initialMoisturePct: 42,
        initialPh: 7.2,
        targetTempRangeC: [52, 60],
        recommendedActions: ['ADD_WATER', 'TURN_PILE'],
      },
    ];

    defaultScenarios.forEach((s) => this.scenarios.set(s.scenarioId, s));
  }

  public executeSimRun(params: {
    traineeUserId: string;
    scenarioId: string;
    actionSequence: SimDecision['chosenAction'][];
  }): SimRun {
    const scenario = this.scenarios.get(params.scenarioId);
    if (!scenario) throw new Error(`Scenario ${params.scenarioId} not found`);

    let currentTemp = scenario.initialTempC;
    let currentMoist = scenario.initialMoisturePct;
    let currentPh = scenario.initialPh;

    const decisions: SimDecision[] = [];

    for (let day = 1; day <= params.actionSequence.length; day++) {
      const act = params.actionSequence[day - 1];
      let expl = '';

      if (act === 'ADD_BULKING_DRY') {
        currentMoist = Math.max(45, currentMoist - 12);
        currentPh = Math.min(7.0, currentPh + 0.8);
        currentTemp += 6;
        expl = 'Dry bulking restored porosity, aerated the pile, and buffered organic acids.';
      } else if (act === 'ADD_WATER') {
        currentMoist = Math.min(65, currentMoist + 10);
        currentTemp = Math.max(45, currentTemp - 8);
        expl = 'Moisture addition absorbed excess heat and prevented beneficial bacterial desiccation.';
      } else if (act === 'TURN_PILE') {
        if (scenario.type === 'ACID_CRASH' && currentMoist > 68) {
          // Bad move if soggy without dry bulking: squishes pile further
          currentTemp -= 4;
          expl = 'Turning without dry bulking compacted soggy mass and cooled the core.';
        } else {
          currentTemp += 4;
          currentPh = Math.min(7.5, currentPh + 0.6);
          expl = 'Turning introduced fresh oxygen and accelerated oxidation of volatile organic acids.';
        }
      } else if (act === 'DO_NOTHING') {
        currentTemp += 1;
        expl = 'Allowed biology to incubate naturally.';
      } else {
        expl = `Action ${act} executed by trainee.`;
      }

      decisions.push({
        step: day,
        simDay: day,
        chosenAction: act,
        resultingTempC: Number(currentTemp.toFixed(1)),
        resultingMoisturePct: Number(currentMoist.toFixed(1)),
        resultingPh: Number(currentPh.toFixed(1)),
        explanation: expl,
      });
    }

    const isRecovered =
      currentTemp >= scenario.targetTempRangeC[0] &&
      currentTemp <= scenario.targetTempRangeC[1] &&
      currentPh >= 6.0;

    const scorePct = isRecovered ? 95 : 45;

    return {
      runId: `SIM-${Date.now()}`,
      traineeUserId: params.traineeUserId,
      scenarioId: params.scenarioId,
      decisions,
      isSuccessfullyRecovered: isRecovered,
      scorePct,
      debriefNotesHindi: isRecovered
        ? 'उत्कृष्ट! आपने समय पर सूखा भूसा मिलाकर और उचित नमी रखकर गड्ढे को पुनः सही तापमान पर पहुँचाया।'
        : 'ध्यान दें: अधिक गीले कचरे को सीधे पलटने से गर्मी कम हो जाती है। पहले सूखा भूसा मिलाएँ।',
      debriefNotesEnglish: isRecovered
        ? 'Well done! By adding dry bulking and regulating moisture, the pit recovered to healthy thermophilic range.'
        : 'Notice: Turning a soggy pile directly causes heat loss. Add dry bulking material first.',
      completedAt: new Date().toISOString(),
    };
  }
}
