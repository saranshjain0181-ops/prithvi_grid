import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractStructuredCompostDraft } from '../src/services/whatsapp-voice.service';
import { weatherPlaybookService } from '../src/services/weather-playbook.service';
import { alertGovernorService } from '../src/services/alert-governor.service';

describe('Phase 10: Wave 3 — Daily Operations & Adoption Tests', () => {
  describe('Workstream F11: WhatsApp Voice Note Parsing & Confirmation Schema', () => {
    it('accurately parses Hindi turning phrase into structured closed-vocabulary action and pit', () => {
      const draft = extractStructuredCompostDraft('Aaj subah pit 3 ko kachra palat diya hai');
      assert.equal(draft.actionType, 'TURNING');
      assert.equal(draft.pitCode, 'PG-PIT-03');
      assert.ok(draft.confidencePct >= 80);
    });

    it('accurately parses water sprinkling intent and units', () => {
      const draft = extractStructuredCompostDraft('Pit 2 mein 50 litre pani chhidka gaya');
      assert.equal(draft.actionType, 'WATERING');
      assert.equal(draft.pitCode, 'PG-PIT-02');
      assert.equal(draft.quantityAmount, 50);
      assert.equal(draft.quantityUnit, 'LITRES');
    });

    it('accurately parses wood ash addition for acidity control', () => {
      const draft = extractStructuredCompostDraft('Pit 4 mein 15 kg lakdi ki raakh dali');
      assert.equal(draft.actionType, 'ADD_ASH');
      assert.equal(draft.pitCode, 'PG-PIT-04');
      assert.equal(draft.quantityAmount, 15);
      assert.equal(draft.quantityUnit, 'KG');
    });
  });

  describe('Workstream F10: Weather-Aware Pre-emptive Playbooks', () => {
    it('triggers Heavy Rain playbook when forecast exceeds 25 mm in 24 hours', () => {
      const result = weatherPlaybookService.evaluateForecast({
        rainMmNext24h: 32.5,
        maxAmbientTempC: 29.0,
        minAmbientTempC: 22.0,
        windSpeedKmph: 12.0,
        humidityPct: 78.0,
      });

      assert.equal(result.triggered, true);
      assert.equal(result.triggerType, 'HEAVY_RAIN');
      assert.ok(result.recommendedActions.some((a) => a.actionType === 'COVER_PIT'));
      assert.ok(result.recommendedActions.some((a) => a.actionType === 'ADD_DRY_BULKING'));
    });

    it('triggers Stagnant Humid Odor Risk playbook when wind is calm and humidity extreme', () => {
      const result = weatherPlaybookService.evaluateForecast({
        rainMmNext24h: 0.0,
        maxAmbientTempC: 34.0,
        minAmbientTempC: 24.0,
        windSpeedKmph: 2.5, // Low wind
        humidityPct: 92.0, // High humidity
      });

      assert.equal(result.triggered, true);
      assert.equal(result.triggerType, 'STILL_HUMID_ODOR_RISK');
      assert.ok(result.recommendedActions.some((a) => a.actionType === 'DELAY_TURNING'));
    });
  });

  describe('Workstream F16: Alert Fatigue Governor & Silent-Failure Watchdog', () => {
    it('guarantees critical safety alerts BYPASS daily interruption budgets', () => {
      const decision = alertGovernorService.evaluateAlertDelivery({
        alertSeverity: 'CRITICAL',
        recipientRole: 'BWG_MANAGER',
        alertsDeliveredTodayCount: 15, // Already exceeded daily limit of 8
        hasDuplicateRecentAlert: false,
      });

      assert.equal(decision.shouldDeliverImmediately, true);
      assert.equal(decision.suppressed, false);
      assert.equal(decision.reason, 'DELIVERED_CRITICAL_BYPASS');
    });

    it('suppresses non-critical alerts when daily role budget is reached', () => {
      const decision = alertGovernorService.evaluateAlertDelivery({
        alertSeverity: 'HIGH',
        recipientRole: 'BWG_MANAGER',
        alertsDeliveredTodayCount: 8, // At maximum budget
        hasDuplicateRecentAlert: false,
      });

      assert.equal(decision.shouldDeliverImmediately, false);
      assert.equal(decision.suppressed, true);
      assert.equal(decision.reason, 'BUDGET_EXCEEDED');
    });

    it('suppresses duplicate alerts within debounce window', () => {
      const decision = alertGovernorService.evaluateAlertDelivery({
        alertSeverity: 'MEDIUM',
        recipientRole: 'BWG_MANAGER',
        alertsDeliveredTodayCount: 2,
        hasDuplicateRecentAlert: true,
      });

      assert.equal(decision.shouldDeliverImmediately, false);
      assert.equal(decision.suppressed, true);
      assert.equal(decision.reason, 'DUPLICATE_SUPPRESSED');
    });

    it('detects silent failure when regular daily waste intake is missing after 24 hours', () => {
      const watchdog = alertGovernorService.checkSilentFailureAbsence({
        expectedAction: 'DAILY_INTAKE',
        hoursSinceLastLogged: 26,
        historicalReliabilityPct: 95,
      });

      assert.equal(watchdog.isSilentFailureDetected, true);
      assert.ok(watchdog.noticeEn.includes('Absence alert'));
    });
  });
});
