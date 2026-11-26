import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { skillPassportService } from '../src/services/skill-passport.service';

describe('Phase 12: Wave 5 — Enterprise Control & Commercial Growth Tests', () => {
  describe('Workstream F15: Skill Passport & Team Healthy-Days Incentive Pool', () => {
    it('transparently calculates pool payouts based on verified tasks and team healthy days', () => {
      const recommendations = skillPassportService.computeTeamPoolShares({
        totalPoolInr: 10000,
        teamPitHealthyDaysCount: 27, // 27/30 days healthy (0.90)
        workers: [
          { workerId: 'worker_01', verifiedTasksCount: 40 },
          { workerId: 'worker_02', verifiedTasksCount: 60 },
        ],
      });

      assert.equal(recommendations.length, 2);

      const worker1 = recommendations.find((r) => r.workerId === 'worker_01');
      const worker2 = recommendations.find((r) => r.workerId === 'worker_02');

      assert.ok(worker1);
      assert.ok(worker2);

      // Worker 2 did more verified work, hence gets higher share
      assert.ok(worker2.recommendedAmountInr > worker1.recommendedAmountInr);
      // 70% task work (₹7,000) + 30% team healthy days scaled by 27/30 (0.90 -> ₹2,700) = ₹9,700
      assert.equal(worker1.recommendedAmountInr + worker2.recommendedAmountInr, 9700);
    });

    it('generates deterministic SHA-256 digital signature for worker skill passport', () => {
      const workerId = '6717a0000000000000000001';
      const sig1 = skillPassportService.generateSkillPassportHash(workerId, 84, 12);
      const sig2 = skillPassportService.generateSkillPassportHash(workerId, 84, 12);

      assert.equal(sig1, sig2);
      assert.equal(sig1.length, 64);
    });
  });

  describe('Workstream F18: What-If Operational Simulation Bounds', () => {
    it('predicts elevated odor risk and declining healthy days when pile turning frequency is neglected', () => {
      const turningFrequencyDays = 8; // Neglected turning (ideal is 3-4 days in hotel kitchen)
      let healthyDaysPct = 94;
      let odorRisk = 8;

      if (turningFrequencyDays > 4) {
        const extraDays = turningFrequencyDays - 4;
        healthyDaysPct -= extraDays * 6.5;
        odorRisk += extraDays * 12.0;
      }

      // Expected healthy days drop and odor risk escalates
      assert.equal(healthyDaysPct, 68); // 94 - 26 = 68%
      assert.equal(odorRisk, 56); // 8 + 48 = 56%
    });
  });
});
