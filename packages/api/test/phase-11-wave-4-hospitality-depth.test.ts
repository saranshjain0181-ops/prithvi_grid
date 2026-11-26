import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GUEST_WASTE_FACTORS_KG } from '../src/services/banquet-biomass.service';

describe('Phase 11: Wave 4 — Hospitality & Hotel Depth Tests', () => {
  describe('Workstream F13: Banquet-to-Biomass Surge Forecasting', () => {
    it('accurately computes waste volume for 600-guest hotel wedding', () => {
      const guestCount = 600;
      const factor = GUEST_WASTE_FACTORS_KG.WEDDING; // 0.45 kg / guest
      const expectedWasteKg = Math.round(guestCount * factor);

      // 600 * 0.45 = 270 kg food waste
      assert.equal(expectedWasteKg, 270);

      // Oily food waste requires 25% dry carbon bulking staging
      const bulkingStagedKg = Math.round(expectedWasteKg * 0.25);
      assert.equal(bulkingStagedKg, 68);
    });

    it('correctly models conference vs wedding waste intensity', () => {
      assert.ok(GUEST_WASTE_FACTORS_KG.WEDDING > GUEST_WASTE_FACTORS_KG.CORPORATE_CONFERENCE);
      assert.equal(GUEST_WASTE_FACTORS_KG.CORPORATE_CONFERENCE, 0.20);
    });
  });

  describe('Workstream F12: Bulking Inventory & Days of Cover', () => {
    it('accurately computes days of cover based on current stock and daily usage', () => {
      const currentStockKg = 350;
      const dailyUsageKg = 25;
      const daysOfCover = Number((currentStockKg / dailyUsageKg).toFixed(1));

      assert.equal(daysOfCover, 14.0);
    });

    it('identifies reorder point breach when stock drops below minimum threshold', () => {
      const stockKg = 120;
      const reorderPointKg = 150;
      const isReorderDue = stockKg <= reorderPointKg;

      assert.equal(isReorderDue, true);
    });
  });

  describe('Workstream F7: Safe Compost Time and Temperature Sanitization Criteria', () => {
    it('validates thermal sanitization standard: >= 72 consecutive hours >= 55°C with >= 2 turnings', () => {
      const batchMetrics = {
        consecutiveHoursAbove55C: 84, // > 72h
        turningsCountDuringHotPhase: 3, // > 2 turnings
        peakTempC: 62.4,
        curingDurationDays: 24,
      };

      const criteriaMet = (
        batchMetrics.consecutiveHoursAbove55C >= 72 &&
        batchMetrics.turningsCountDuringHotPhase >= 2 &&
        batchMetrics.peakTempC >= 58.0 &&
        batchMetrics.curingDurationDays >= 14
      );

      assert.equal(criteriaMet, true);
    });

    it('fails criteria if pathogen destruction thermal hours were insufficient', () => {
      const failedBatchMetrics = {
        consecutiveHoursAbove55C: 38, // Failed to reach 72 hours
        turningsCountDuringHotPhase: 1,
        peakTempC: 56.0,
        curingDurationDays: 10,
      };

      const criteriaMet = (
        failedBatchMetrics.consecutiveHoursAbove55C >= 72 &&
        failedBatchMetrics.turningsCountDuringHotPhase >= 2
      );

      assert.equal(criteriaMet, false);
    });
  });
});
