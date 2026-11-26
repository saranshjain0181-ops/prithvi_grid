import crypto from 'crypto';
import { Types } from 'mongoose';
import { WorkerSkillPassport, IWorkerSkillPassport } from '../db/models/WorkerSkillPassport';

export interface IncentivePoolInput {
  totalPoolInr: number;
  teamPitHealthyDaysCount: number; // e.g. 27 out of 30 days
  workers: Array<{
    workerId: string | Types.ObjectId;
    verifiedTasksCount: number;
  }>;
}

export interface PayoutRecommendation {
  workerId: string;
  sharePct: number;
  recommendedAmountInr: number;
  formulaBreakdown: string;
}

export class SkillPassportService {
  /**
   * Computes transparent monthly Team Healthy-Days incentive pool distribution (Feature 15).
   * [LEGAL-REVIEW]: Payouts require explicit facility manager approval. System never auto-disburses.
   */
  public computeTeamPoolShares(input: IncentivePoolInput): PayoutRecommendation[] {
    const totalTasks = input.workers.reduce((sum, w) => sum + w.verifiedTasksCount, 0);
    if (totalTasks === 0 || input.workers.length === 0) {
      return [];
    }

    const healthyDaysMultiplier = Math.min(1.0, input.teamPitHealthyDaysCount / 30);

    return input.workers.map((w) => {
      const taskShare = w.verifiedTasksCount / totalTasks;
      const combinedShare = Number((taskShare * 0.70 + (1 / input.workers.length) * 0.30 * healthyDaysMultiplier).toFixed(3));
      const amount = Math.round(input.totalPoolInr * combinedShare);

      return {
        workerId: w.workerId.toString(),
        sharePct: Number((combinedShare * 100).toFixed(1)),
        recommendedAmountInr: amount,
        formulaBreakdown: `${w.verifiedTasksCount}/${totalTasks} tasks (70%) + team ${input.teamPitHealthyDaysCount}/30 healthy days (30%)`,
      };
    });
  }

  /**
   * Generates a tamper-evident digital Skill Passport signature hash.
   */
  public generateSkillPassportHash(workerId: string, verifiedTasksCount: number, tenureMonths: number): string {
    const canonical = `${workerId}:${verifiedTasksCount}:${tenureMonths}:PRITHVI_SKILL_CHAIN_2026`;
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
}

export const skillPassportService = new SkillPassportService();
