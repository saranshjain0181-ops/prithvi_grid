import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BuyerAdvisorService } from '../src/services/buyer-advisor.service';
import { FieldProofService } from '../src/services/field-proof.service';
import { ComplaintRecallService } from '../src/services/complaint-recall.service';
import { PracticePitService } from '../src/services/practice-pit.service';
import { ShiftHuddleService } from '../src/services/shift-huddle.service';
import { OperatingRhythmService } from '../src/services/operating-rhythm.service';
import { FracasReliabilityService } from '../src/services/fracas-reliability.service';

describe('Phase 31: Volume 5 Wave 3 — Buyer Trust, Quality Workflows & Operational Learning Tests', () => {
  it('F12: Buyer Application Advisor tailors rates, warns on salinity and respects claims gate', () => {
    const advisor = new BuyerAdvisorService();

    // High salinity compost on delicate seedlings
    const seedlingGuidance = advisor.evaluateGuidance({
      lotNumber: 'LOT-HIGH-SALT-01',
      cropId: 'CROP-SEEDLING',
      measuredLotConductivityDsPerM: 2.4, // exceeds 1.8 limit
      measuredLotPh: 6.8,
      hasLabVerifiedNutrientReport: true,
    });

    assert.strictEqual(seedlingGuidance.isSuitabilityMet, false);
    assert.strictEqual(seedlingGuidance.dilutionRequired, true);
    assert.strictEqual(seedlingGuidance.alternativeRecommendedCrop, 'CROP-VEG-BED');
    assert.ok(seedlingGuidance.advisoryTextEnglish.includes('CAUTION: Lot conductivity'));

    // Safe application on vegetable beds
    const vegGuidance = advisor.evaluateGuidance({
      lotNumber: 'LOT-HIGH-SALT-01',
      cropId: 'CROP-VEG-BED',
      measuredLotConductivityDsPerM: 2.4, // well within 3.5 limit
      measuredLotPh: 6.8,
      hasLabVerifiedNutrientReport: true,
    });
    assert.strictEqual(vegGuidance.isSuitabilityMet, true);
    assert.strictEqual(vegGuidance.claimsGatePassed, true);
  });

  it('F13: Field Proof runs trials, pre-registers success rules and creates verified proof cards', () => {
    const fp = new FieldProofService();

    const trial = fp.startTrial({
      protocolId: 'PROTO-SEEDLING-GERM',
      lotNumber: 'LOT-EXP-45',
      participantType: 'EXTERNAL_BUYER',
      participantName: 'Sanjay Nursery Bhopal',
    });

    fp.recordObservation({
      observationId: 'OBS-1',
      trialId: trial.trialId,
      dayNumber: 14,
      germinationRatePct: 92,
      averagePlantHeightCm: 18.5,
      leafColorRating: 'LUSH_DARK_GREEN',
      recordedAt: new Date().toISOString(),
    });

    fp.completeTrial(trial.trialId, true);

    const card = fp.generateProofCard({
      lotNumber: 'LOT-EXP-45',
      agronomistUserId: 'USR-AGRO-DR-VERMA',
      claimsRegisterRef: 'REG-CLAIM-PROOF-2026-12',
    });

    assert.strictEqual(card.totalTrialsConducted, 1);
    assert.strictEqual(card.successRatePct, 100);
    assert.ok(card.isAgronomistApproved);
  });

  it('F14: Complaint and Recall initiates quarantine, CAPA and enforces dual recall approvers', () => {
    const cr = new ComplaintRecallService();

    const { complaint, quarantine } = cr.registerComplaint({
      lotNumber: 'LOT-CONTAM-77',
      sourceType: 'BUYER',
      severity: 'SAFETY_ISSUE',
      description: 'Customer found sharp glass fragments in 25kg bag',
      foreignContaminant: 'GLASS',
      stockHeldKg: 1500,
      relatedLots: ['LOT-CONTAM-78'],
    });

    assert.strictEqual(complaint.status, 'QUARANTINED');
    assert.ok(quarantine);
    assert.strictEqual(quarantine?.status, 'ACTIVE');

    // Create and verify CAPA
    const capa = cr.createCAPA({
      complaintId: complaint.complaintId,
      rootCauseAnalysis: 'Screening mesh tear at vibratory hopper station 2',
      preventiveAction: 'Install magnetic trap and optical separator pre-screening',
      assignedToUserId: 'USR-MAINT-ENG',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.strictEqual(capa.status, 'OPEN');

    const closed = cr.verifyCAPA(capa.capaId);
    assert.strictEqual(closed.status, 'VERIFIED_CLOSED');
    assert.strictEqual(complaint.status, 'RESOLVED');

    // Dual approver requirement for recall
    assert.throws(
      () =>
        cr.initiateRecall({
          lotNumber: 'LOT-CONTAM-77',
          approverUserIds: ['USR-SAME-PERSON', 'USR-SAME-PERSON'], // Fails segregation
          totalKgSubjectToRecall: 3000,
        }),
      /approver 1 and 2 must be different individuals/
    );

    const recall = cr.initiateRecall({
      lotNumber: 'LOT-CONTAM-77',
      approverUserIds: ['USR-LEGAL-COUNSEL', 'USR-HEAD-OPERATIONS'],
      totalKgSubjectToRecall: 3000,
    });
    assert.strictEqual(recall.status, 'INITIATED');
    assert.strictEqual(quarantine?.status, 'RECALLED');
  });

  it('F15: Practice Pit Simulator models acid crash recovery and formative feedback', () => {
    const sim = new PracticePitService();

    // Trainee recovers acid crash by adding dry bulking
    const run = sim.executeSimRun({
      traineeUserId: 'USR-NEW-RECRUIT-ANIL',
      scenarioId: 'SCEN-ACID-CRASH',
      actionSequence: ['ADD_BULKING_DRY', 'DO_NOTHING', 'TURN_PILE'],
    });

    assert.strictEqual(run.isSuccessfullyRecovered, true);
    assert.ok(run.scorePct >= 90);
    assert.ok(run.debriefNotesEnglish.includes('recovered to healthy thermophilic range'));
  });

  it('F16: Shift Huddle generates spoken briefings and heat guard advice', () => {
    const huddle = new ShiftHuddleService();

    const brief = huddle.generateBrief({
      facilityId: 'FACILITY-BHOPAL-01',
      shiftType: 'MORNING',
      topTasks: ['Turn Pit 3', 'Screen Lot 12', 'Restock Sawdust'],
      pitsToWatch: [{ pitId: 'PIT-03', reason: 'High thermophilic heat (64°C)' }],
      temperatureForecastC: 41, // Heat wave
      safetyTopicRotation: 'Proper hydration and ergonomic shovel posture',
      nearMissAlert: 'Near-miss yesterday: Forklift blind spot at curing yard gate',
    });

    assert.ok(brief.weatherHeatAdvice.includes('High heat alert: Forecast 41°C'));
    assert.ok(brief.spokenScriptHindi.includes('काम सुरक्षित ढंग से करें'));

    const exec = huddle.recordExecution({
      briefId: brief.briefId,
      conductedByUserId: 'USR-SUPERVISOR-RAM',
      attendanceUserIds: ['USR-W1', 'USR-W2', 'USR-W3'],
      pollResults: { yesCount: 3, noCount: 0 },
      durationMinutes: 4.5,
    });
    assert.strictEqual(exec.attendanceUserIds.length, 3);
  });

  it('F17: Operating Rhythm binds widget snapshots, tracks actions and rolls over overdue items', () => {
    const rhythm = new OperatingRhythmService();

    const meeting = rhythm.conductMeeting({
      facilityId: 'FACILITY-MAIN',
      cadence: 'WEEKLY_OPS_REVIEW',
      title: 'Weekly Operations Cadence - Week 43',
      agendaItems: [
        {
          itemId: 'ITEM-1',
          title: 'Yard Performance & Bottlenecks',
          boundWidgetId: 'WIDGET-YARD-EFFICIENCY',
          snapshotDataRef: 'SNAP-W43-EFFICIENCY',
        },
      ],
      decisionsTaken: ['Add second screener operator for night shift'],
      newActions: [
        {
          title: 'Cross-train Ramesh on screener maintenance',
          assignedToUserId: 'USR-TRAINER',
          dueDate: new Date(Date.now() - 3600000).toISOString(), // Overdue
        },
      ],
    });

    assert.strictEqual(meeting.actionsCreated.length, 1);
    assert.ok(meeting.minutesSealedHash.length === 64);

    const overdue = rhythm.getOverdueActions();
    assert.strictEqual(overdue.length, 1);
    assert.strictEqual(overdue[0].isOverdue, true);
    assert.strictEqual(overdue[0].status, 'ESCALATED');
  });

  it('F18: FRACAS Reliability logs failure modes, computes MTBF and creates DCRs', () => {
    const fracas = new FracasReliabilityService();

    fracas.logFailure({
      nodeId: 'NODE-INDORE-101',
      hardwareRevision: 'HW-REV-3.1',
      componentLot: 'LOT-PROBE-MOIST-2026-A',
      firmwareVersion: 'FW-2.4.1',
      failureCategory: 'COMPONENT',
      primaryFailureMode: 'MOISTURE_CORROSION',
      symptomsDescription: 'Sensor reading stuck at 100% due to solder joint pitting in acid environment',
    });

    fracas.logFailure({
      nodeId: 'NODE-INDORE-102',
      hardwareRevision: 'HW-REV-3.1',
      componentLot: 'LOT-PROBE-MOIST-2026-A',
      firmwareVersion: 'FW-2.4.1',
      failureCategory: 'COMPONENT',
      primaryFailureMode: 'MOISTURE_CORROSION',
      symptomsDescription: 'Corrosion at probe interface',
    });

    const metrics = fracas.computeReliabilityMetrics(50);
    assert.strictEqual(metrics.totalFailuresLogged, 2);
    assert.strictEqual(metrics.failurePareto[0].mode, 'MOISTURE_CORROSION');
    assert.strictEqual(metrics.failurePareto[0].count, 2);

    const dcr = fracas.createDesignChangeRequest({
      title: 'Upgrade probe conformal coating to parylene-C',
      affectedFailureMode: 'MOISTURE_CORROSION',
      targetHardwareRevision: 'HW-REV-3.2',
      supplierActionRequired: 'Supplier must verify 500-hour nitric acid bath exposure',
      approvedByAuthorityMatrix: true,
    });
    assert.strictEqual(dcr.status, 'APPROVED_FOR_PILOT');
  });
});
