import { Types } from 'mongoose';
import { DailyPlanTask, IDailyPlanTask, PlanTaskType } from '../db/models/DailyPlanTask';
import { AiAlertSanjivani } from '../db/models/AiAlertSanjivani';
import { pitPersonalityService } from './pit-personality.service';

export interface CandidateTask {
  pitId: string | Types.ObjectId;
  taskType: PlanTaskType;
  titleEn: string;
  titleHi: string;
  reasonEn: string;
  reasonHi: string;
  audioPromptHi: string;
  urgencyScore: number; // 0 to 100
  expectedEffortMinutes: number;
  expectedBenefitDelta: number;
}

export class DailyPlannerService {
  /**
   * Generates next-best-action task list for a Safai Mitra for today's shift (Feature 9).
   */
  public async generateAajKaPlan(params: {
    facilityId: string | Types.ObjectId;
    workerId: string | Types.ObjectId;
    planDate?: string;
    shiftDurationMinutes?: number;
    assignedPitIds: Array<string | Types.ObjectId>;
  }): Promise<IDailyPlanTask[]> {
    const facilityObjId = new Types.ObjectId(params.facilityId.toString());
    const workerObjId = new Types.ObjectId(params.workerId.toString());
    const dateStr = params.planDate || new Date().toISOString().slice(0, 10);
    const maxShiftMinutes = params.shiftDurationMinutes || 360; // 6 hours operational window

    // 1. Gather candidate tasks across open alerts and scheduled interventions
    const candidates: CandidateTask[] = [];

    // A. Check for high-methane or acid-crash Sanjivani alerts on assigned pits
    const openAlerts = await AiAlertSanjivani.find({
      boxId: { $in: params.assignedPitIds.map((id) => new Types.ObjectId(id.toString())) },
      status: 'OPEN',
    }).sort({ severity: -1 });

    for (const alert of openAlerts) {
      const boxId = alert.boxId || new Types.ObjectId('6716a1b2c3d4e5f678901234');
      if (alert.alertType === 'METHANE_CRITICAL' || alert.alertType === 'METHANE_HIGH') {
        candidates.push({
          pitId: boxId,
          taskType: 'TURNING',
          titleEn: 'Turn Compost Heap (Aeration Required)',
          titleHi: 'कचरा पलटें (हवा देना जरूरी है)',
          reasonEn: 'Methane has been rising for 6 hours; pit requires aeration.',
          reasonHi: 'मीथेन 6 घंटे से बढ़ रही है, हवा देने के लिए कचरा पलटना जरूरी है।',
          audioPromptHi: 'पहले इस पिट को पलटें, क्योंकि मीथेन गैस बढ़ रही है।',
          urgencyScore: 95,
          expectedEffortMinutes: 30,
          expectedBenefitDelta: 18,
        });
      } else if (alert.alertType === 'ACID_CRASH') {
        candidates.push({
          pitId: boxId,
          taskType: 'ADD_ASH',
          titleEn: 'Add Wood Ash (Acid Neutralization)',
          titleHi: 'लकड़ी की राख मिलाएं (एसिड न्यूट्रल करें)',
          reasonEn: 'pH dropped below 5.2. Alkaline wood ash required.',
          reasonHi: 'एसिडिटी बढ़ गई है, 15 किलो राख मिलाकर ठीक करें।',
          audioPromptHi: 'पिट में लकड़ी की राख मिलाएं ताकि बदबू और एसिड रुक सके।',
          urgencyScore: 90,
          expectedEffortMinutes: 20,
          expectedBenefitDelta: 15,
        });
      }
    }

    // B. Default routine turning and watering if no critical alerts
    for (const pitId of params.assignedPitIds) {
      const pitObjId = new Types.ObjectId(pitId.toString());
      const hasAlert = candidates.some((c) => c.pitId.toString() === pitObjId.toString());

      if (!hasAlert) {
        candidates.push({
          pitId: pitObjId,
          taskType: 'WATERING',
          titleEn: 'Sprinkle Water & Check Moisture',
          titleHi: 'नमी जांचें और पानी का छिड़काव करें',
          reasonEn: 'Routine moisture maintenance for active thermophilic decomposition.',
          reasonHi: 'कम्पोस्ट को सूखने से बचाने के लिए पानी छिड़कें।',
          audioPromptHi: 'पिट में हल्का पानी छिड़कें ताकि नमी बनी रहे।',
          urgencyScore: 60,
          expectedEffortMinutes: 15,
          expectedBenefitDelta: 8,
        });
      }
    }

    // 2. Sort candidate tasks deterministically by urgency score (Safety first)
    candidates.sort((a, b) => b.urgencyScore - a.urgencyScore);

    // 3. Fit tasks into worker's shift hours with buffer (3 to 7 tasks max)
    let allocatedMinutes = 0;
    const selectedTasks: CandidateTask[] = [];

    for (const task of candidates) {
      if (allocatedMinutes + task.expectedEffortMinutes <= maxShiftMinutes && selectedTasks.length < 7) {
        selectedTasks.push(task);
        allocatedMinutes += task.expectedEffortMinutes;
      }
    }

    // 4. Persist to DailyPlanTask collection
    await DailyPlanTask.deleteMany({ workerId: workerObjId, planDate: dateStr, status: 'PENDING' });

    const createdTasks: IDailyPlanTask[] = [];
    for (let i = 0; i < selectedTasks.length; i++) {
      const item = selectedTasks[i];
      const taskDoc = await DailyPlanTask.create({
        facilityId: facilityObjId,
        workerId: workerObjId,
        pitId: new Types.ObjectId(item.pitId.toString()),
        planDate: dateStr,
        taskOrder: i + 1,
        taskType: item.taskType,
        titleEn: item.titleEn,
        titleHi: item.titleHi,
        audioPromptHi: item.audioPromptHi,
        reasonEn: item.reasonEn,
        reasonHi: item.reasonHi,
        urgencyScore: item.urgencyScore,
        expectedEffortMinutes: item.expectedEffortMinutes,
        expectedBenefitDelta: item.expectedBenefitDelta,
        status: 'PENDING',
      });
      createdTasks.push(taskDoc);
    }

    return createdTasks;
  }
}

export const dailyPlannerService = new DailyPlannerService();
