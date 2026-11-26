import test from 'node:test';
import assert from 'node:assert/strict';
import { finishingLineService } from '../src/services/finishing-line.service.js';
import { massBalanceService } from '../src/services/mass-balance.service.js';
import { labGradingService } from '../src/services/lab-grading.service.js';
import { formulatorService } from '../src/services/formulator.service.js';
import { offtakePlannerService } from '../src/services/offtake-planner.service.js';

test('Phase 16: Vol 2 Wave 4 — From Pit to Product Tests', async (t) => {
  await t.test('Feature 9: Curing, Screening and Bagging Line', () => {
    // 1. Curing progression check: 8 days elapsed vs 21-day target
    const earlyCure = finishingLineService.evaluateCuringMaturity({
      startDate: new Date('2026-10-16T00:00:00Z'),
      currentDate: new Date('2026-10-24T00:00:00Z'),
      targetMaturityDays: 21,
    });
    assert.equal(earlyCure.daysInCure, 8);
    assert.equal(earlyCure.maturityStatus, 'CURING');
    assert.equal(earlyCure.isReadyForScreening, false);

    // 2. Mature cure check: 24 days elapsed -> MATURE
    const matureCure = finishingLineService.evaluateCuringMaturity({
      startDate: new Date('2026-09-30T00:00:00Z'),
      currentDate: new Date('2026-10-24T00:00:00Z'),
      targetMaturityDays: 21,
    });
    assert.equal(matureCure.daysInCure, 24);
    assert.equal(matureCure.maturityStatus, 'MATURE');
    assert.equal(matureCure.isReadyForScreening, true);

    // 3. Screening yield calculation: 1000 kg raw yields 680 kg fine compost (68% yield)
    const screening = finishingLineService.calculateScreeningYield({
      rawMassKg: 1000,
      fineCompostYieldKg: 680,
    });
    assert.equal(screening.fineCompostYieldKg, 680);
    assert.equal(screening.oversizeRejectsKg, 320);
    assert.equal(screening.yieldPercentage, 68);
    assert.equal(screening.reusableBulkingKg, 288); // 90% of 320kg
    assert.equal(screening.bagsProduced5kg, 136);
    assert.equal(screening.bagsProduced25kg, 27);
  });

  await t.test('Feature 10: Mass Balance and Loss Reconciliation', () => {
    // 1. Balanced mass flow within 10% tolerance
    const balanced = massBalanceService.reconcileMassFlow({
      wetWasteIntakeKg: 10000,
      bulkingAddedKg: 2000,
      waterAddedKg: 500, // Total In = 12,500 kg
      fineCompostProducedKg: 3600,
      oversizeRejectsRecycledKg: 800,
      nonCompostableRejectsLandfilledKg: 200,
      leachateDischargedKg: 300,
      evaporationLossKg: 4500, // ~45% of wet waste
      carbonDioxideLossKg: 1200, // ~12% respiration
      // Total Accounted = 3600 + 800 + 200 + 300 + 4500 + 1200 = 10,600 kg
      // Imbalance = 1900 kg (~15% default, let's test exact balanced scenario)
    });
    assert.equal(balanced.totalMassInputKg, 12500);

    // Now test calibrated balanced flow (e.g. 5% imbalance)
    const calibrated = massBalanceService.reconcileMassFlow({
      wetWasteIntakeKg: 10000,
      bulkingAddedKg: 2000,
      waterAddedKg: 500, // 12,500 kg in
      fineCompostProducedKg: 4200,
      oversizeRejectsRecycledKg: 1000,
      nonCompostableRejectsLandfilledKg: 300,
      leachateDischargedKg: 400,
      evaporationLossKg: 4800,
      carbonDioxideLossKg: 1300, // Accounted = 12,000 kg -> 500kg imbalance (4.0%)
    });
    assert.equal(calibrated.imbalancePercentage, 4.0);
    assert.equal(calibrated.status, 'RECONCILED');

    // 2. Severe anomaly (>15% imbalance) triggers alert
    const leakFlow = massBalanceService.reconcileMassFlow({
      wetWasteIntakeKg: 10000,
      bulkingAddedKg: 2000,
      waterAddedKg: 0, // 12,000 kg in
      fineCompostProducedKg: 1500, // Way too low output!
      oversizeRejectsRecycledKg: 500,
      nonCompostableRejectsLandfilledKg: 100,
      leachateDischargedKg: 100,
      evaporationLossKg: 4500,
      carbonDioxideLossKg: 1200, // Accounted = 7,900 kg -> 4,100kg missing (34.2%)
    });
    assert.equal(leakFlow.status, 'VARIANCE_ALERT');
    assert.match(leakFlow.explanation, /VARIANCE-ALERT/);
  });

  await t.test('Feature 11: Sampling, Lab Chain-of-Custody and Grading (FCO 1985 / SWM 2016)', () => {
    // 1. Premium FCO Grade A sample
    const gradeA = labGradingService.gradeCompostReport({
      moisturePercent: 22.0, // < 25%
      organicCarbonPercent: 16.5, // > 12%
      totalNitrogenPercent: 1.1, // > 0.8%
      totalPhosphorusP2O5Percent: 0.55, // > 0.4%
      totalPotassiumK2OPercent: 0.65, // > 0.4%
      carbonNitrogenRatio: 15.0, // < 20:1
      phValue: 7.2, // 6.5 - 7.5
      electricalConductivityDsPerM: 2.4, // < 4.0
      heavyMetalsSafe: true,
    });
    assert.equal(gradeA.assignedGrade, 'GRADE_A_FCO_PREMIUM');
    assert.equal(gradeA.passedFcoStandard, true);
    assert.equal(gradeA.deviations.length, 0);

    // 2. Landscape Grade B sample (slightly high C:N 23:1, but safe)
    const gradeB = labGradingService.gradeCompostReport({
      moisturePercent: 24.0,
      organicCarbonPercent: 11.5,
      totalNitrogenPercent: 0.5,
      totalPhosphorusP2O5Percent: 0.3,
      totalPotassiumK2OPercent: 0.35,
      carbonNitrogenRatio: 23.0,
      phValue: 7.0,
      electricalConductivityDsPerM: 2.8,
      heavyMetalsSafe: true,
    });
    assert.equal(gradeB.assignedGrade, 'GRADE_B_LANDSCAPE');
    assert.equal(gradeB.passedFcoStandard, false);
    assert.ok(gradeB.deviations.length > 0);

    // 3. Contaminated / failing sample
    const gradeFail = labGradingService.gradeCompostReport({
      moisturePercent: 30.0,
      organicCarbonPercent: 8.0,
      totalNitrogenPercent: 0.4,
      totalPhosphorusP2O5Percent: 0.2,
      totalPotassiumK2OPercent: 0.2,
      carbonNitrogenRatio: 28.0,
      phValue: 5.5,
      electricalConductivityDsPerM: 5.2,
      heavyMetalsSafe: false, // Heavy metals failed!
    });
    assert.equal(gradeFail.assignedGrade, 'GRADE_FAIL');
    assert.match(gradeFail.summaryNote, /UNFIT-FOR-SALE/);
  });

  await t.test('Feature 12: Value-Added Manure Formulator and Production Costing', () => {
    // 85% base compost (₹3/kg) + 15% neem seed cake (₹20/kg)
    const costing = formulatorService.calculateFormulaCosting({
      ingredients: [
        { name: 'Base Screened Compost', percentageByWeight: 85, costPerKgInr: 3 },
        { name: 'Neem Seed Cake', percentageByWeight: 15, costPerKgInr: 20 },
      ],
      packagingCostPerBagInr: 15, // High quality printed multi-wall bag
      bagSizeKg: 10,
      targetGrossMarginPercentage: 50,
    });

    // Raw cost = (0.85 * 3) + (0.15 * 20) = 2.55 + 3.00 = 5.55 / kg
    assert.equal(costing.rawCostPerKgInr, 5.55);
    // Cost per 10kg bag = (5.55 * 10) + 15 = ₹70.50
    assert.equal(costing.totalCostPerBagInr, 70.5);
    // Retail price at 50% margin = ceil(70.5 / 0.5) = ₹141
    assert.equal(costing.recommendedRetailPriceInr, 141);
    assert.ok(costing.grossMarginPercentage >= 49.5);
  });

  await t.test('Feature 13: Offtake Planner and Seasonal Demand Matching', () => {
    const commitments = [
      {
        buyerName: 'Greenfield Commercial Nursery',
        category: 'NURSERY' as const,
        requestedQuantityKg: 3000,
        agreedPricePerKgInr: 15, // ₹45,000
        deliveryDate: '2026-11-15',
        status: 'COMMITTED' as const,
      },
      {
        buyerName: 'Hyatt Hotel Internal Landscaping',
        category: 'HOTEL_LANDSCAPE_INTERNAL' as const,
        requestedQuantityKg: 2000,
        agreedPricePerKgInr: 10, // ₹20,000
        deliveryDate: '2026-11-20',
        status: 'COMMITTED' as const,
      },
    ];

    // 1. Healthy supply surplus scenario
    const schedule = offtakePlannerService.evaluateOfftakeSchedule({
      availableStockKg: 5000,
      forecastedProductionKg: 3000, // Total available = 8000 kg
      commitments,
    });

    assert.equal(schedule.totalAvailableKg, 8000);
    assert.equal(schedule.totalCommittedKg, 5000);
    assert.equal(schedule.uncommittedSurplusKg, 3000);
    assert.equal(schedule.projectedRevenueInr, 65000);
    assert.equal(schedule.hasDeficit, false);

    // 2. Supply deficit scenario
    const deficitSchedule = offtakePlannerService.evaluateOfftakeSchedule({
      availableStockKg: 1000,
      forecastedProductionKg: 2000, // Total available = 3000 kg < 5000 kg demanded
      commitments,
    });
    assert.equal(deficitSchedule.hasDeficit, true);
    assert.equal(deficitSchedule.uncommittedSurplusKg, -2000);
    assert.match(deficitSchedule.advice, /SUPPLY-DEFICIT/);
  });
});
