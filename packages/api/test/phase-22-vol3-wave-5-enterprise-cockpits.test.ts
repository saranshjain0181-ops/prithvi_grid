import test from 'node:test';
import assert from 'node:assert/strict';
import { supremeHeadDeckService } from '../src/services/supreme-head-deck.service.js';
import { agronomyCockpitService } from '../src/services/agronomy-cockpit.service.js';
import { complianceRiskCockpitService } from '../src/services/compliance-risk-cockpit.service.js';
import { hqDepartmentCockpitsService } from '../src/services/hq-department-cockpits.service.js';

test('Wave 5 Cockpits: Feature 18 - Supreme Head Control Deck & Monday Brief', () => {
  const deck = supremeHeadDeckService.composeDeck({
    asOfDate: '2026-10-26',
    activeFacilitiesCount: 42,
    activeNodesCount: 840,
    totalWetWasteDivertedTons: 1250,
    arrLakhsInr: 96,
    fleetUptimePct: 99.2,
    criticalAlertsCount: 0,
    clientNpsScore: 68,
    aiGatewayTokensThousands: 450,
  });

  assert.equal(deck.sections.length, 8);
  assert.equal(deck.avoidedMethaneKg, 1250 * 62.5);
  assert.ok(deck.mondayBriefMarkdown.includes('Prithvi-Grid Executive Monday Brief'));
  assert.ok(deck.mondayBriefMarkdown.includes('840 Smart Spears'));
  assert.equal(deck.sections.find((s) => s.sectionKey === 'REGULATORY_RISK')?.status, 'GREEN');
});

test('Wave 5 Cockpits: Feature 22 - Agronomy & Biological Performance Cockpit', () => {
  const agronomy = agronomyCockpitService.evaluateFleetAgronomy({
    avgDaysThermophilic: 14.5,
    avgHoursToFirstPeak: 42,
    avgAcidCrashRecoveryHours: 32,
    avgFinishedCnRatio: 17.5,
    pendingReviews: [
      {
        reviewId: 'REV-1',
        facilityId: 'FAC-1',
        pitId: 'PIT-3',
        eventType: 'ACID_CRASH',
        severity: 'CRITICAL',
        detectedAt: new Date(),
        suggestedIntervention: 'Add wood ash buffer',
        status: 'PENDING_REVIEW',
      },
    ],
  });

  assert.equal(agronomy.benchmarks.length, 4);
  assert.equal(agronomy.highPriorityReviewsCount, 1);
  assert.ok(agronomy.overallFleetBiologicalScorePct > 70);
  assert.ok(agronomy.expertAgronomicAdvisoryHindi.includes('[EXPERT-REVIEW]'));
});

test('Wave 5 Cockpits: Feature 23 - Compliance, Audit & Legal Risk Cockpit', () => {
  // 1. Critical CPCB Zero Discharge breach
  const breachAssessment = complianceRiskCockpitService.evaluateCompliance({
    facilityId: 'FAC-MUNICIPAL-01',
    auditPeriodMonth: '2026-10',
    thermalPathogenKillPassed: true,
    finishedMoisturePct: 22,
    leachateZeroDischargeVerified: false, // critical failure
    perimeterOdorComplaintsCount: 1,
  });

  assert.equal(breachAssessment.highestExposure, 'STATUTORY_SHUTDOWN');
  assert.equal(breachAssessment.isAuditPackEligible, false);
  assert.ok(breachAssessment.legalAdvisoryHindi.includes('[CRITICAL-LEGAL]'));
  assert.ok(breachAssessment.tamperHashSha256.length === 64); // SHA-256 hex string

  // 2. Fully compliant facility
  const cleanAssessment = complianceRiskCockpitService.evaluateCompliance({
    facilityId: 'FAC-TOWNSHIP-04',
    auditPeriodMonth: '2026-10',
    thermalPathogenKillPassed: true,
    finishedMoisturePct: 20,
    leachateZeroDischargeVerified: true,
    perimeterOdorComplaintsCount: 0,
  });

  assert.equal(cleanAssessment.overallComplianceScorePct, 100);
  assert.equal(cleanAssessment.highestExposure, 'LOW');
  assert.equal(cleanAssessment.isAuditPackEligible, true);
  assert.ok(cleanAssessment.legalAdvisoryHindi.includes('शत-प्रतिशत वैधानिक अनुपालन'));
});

test('Wave 5 Cockpits: Feature 24 - HQ Department Cockpits & Cross-Functional Workflow', () => {
  // Test KPI overview
  const fleetOverview = hqDepartmentCockpitsService.getDepartmentKpiOverview({
    department: 'FLEET_FIELD_SERVICE',
    inboundHandoffs: [],
  });

  assert.equal(fleetOverview.department, 'FLEET_FIELD_SERVICE');
  assert.equal(fleetOverview.status, 'HEALTHY');

  // Test cross-department handoff creation
  const handoff = hqDepartmentCockpitsService.createHandoffTicket({
    sourceDepartment: 'FLEET_FIELD_SERVICE',
    targetDepartment: 'CUSTOMER_SUCCESS',
    title: 'Replacement spear node deployed to Pit 14 - notify client facility head',
    facilityId: 'FAC-201',
    priority: 'ELEVATED',
  });

  assert.equal(handoff.status, 'PENDING');
  assert.equal(handoff.sourceDepartment, 'FLEET_FIELD_SERVICE');
  assert.equal(handoff.targetDepartment, 'CUSTOMER_SUCCESS');

  // Progress to completed
  const completedHandoff = hqDepartmentCockpitsService.transitionHandoffStatus(
    handoff,
    'COMPLETED'
  );
  assert.equal(completedHandoff.status, 'COMPLETED');
  assert.ok(completedHandoff.resolvedAt !== undefined);
});
