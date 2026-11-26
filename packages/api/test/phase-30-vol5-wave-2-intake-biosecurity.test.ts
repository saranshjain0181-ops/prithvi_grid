import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PathwayRouterService } from '../src/services/pathway-router.service';
import { SourceReductionService } from '../src/services/source-reduction.service';
import { WasteAuditService } from '../src/services/waste-audit.service';
import { HygieneZoningService } from '../src/services/hygiene-zoning.service';
import { FencelineOdorService } from '../src/services/fenceline-odor.service';

describe('Phase 30: Volume 5 Wave 2 — Upstream Intake, Auditing & Biosecurity Tests', () => {
  it('F7: Pathway Router strictly excludes biomedical waste, routes surges and flags consignment discrepancies', () => {
    const router = new PathwayRouterService();

    // 1. Biomedical waste is rejected immediately
    const bioDecision = router.routeContainer({
      containerId: 'BIN-WARD-RED',
      streamType: 'HOSPITAL_WASTE',
      massKg: 50,
      hasBiomedicalHazard: true,
      onSitePitAvailableCapacityKg: 5000,
    });
    assert.strictEqual(bioDecision.recommendedPathway, 'REJECT');
    assert.strictEqual(bioDecision.chosenPathway, 'REJECT');
    assert.ok(bioDecision.reasons[0].includes('Biomedical or infectious waste detected'));

    // 2. Pre-composted cured material routes to vermicompost feed
    const vermiDecision = router.routeContainer({
      containerId: 'BIN-CURED-01',
      streamType: 'PRE_COMPOST',
      massKg: 400,
      hasBiomedicalHazard: false,
      onSitePitAvailableCapacityKg: 5000,
      isPreCompostedCured: true,
    });
    assert.strictEqual(vermiDecision.recommendedPathway, 'VERMICOMPOST_FEED');

    // 3. High-fat banquet waste routes to licensed external processor
    router.registerExternalProcessor({
      processorId: 'PROC-GREASE-EXT',
      name: 'Indore Bio-Gas & Grease Processing Ltd',
      licenseNumber: 'MP-PCB-WM-2026-88',
      licenseExpiresAt: new Date(Date.now() + 365 * 86400 * 1000).toISOString(),
      acceptedStreams: ['BANQUET_FAT_HEAVY'],
      maxDailyCapacityKg: 10000,
      ratePerKgInr: 1.5,
      isActive: true,
    });

    const fatDecision = router.routeContainer({
      containerId: 'BIN-BANQUET-FATS',
      streamType: 'BANQUET_FAT_HEAVY',
      massKg: 850,
      hasBiomedicalHazard: false,
      onSitePitAvailableCapacityKg: 5000,
      isFatOrOilHeavy: true,
    });
    assert.strictEqual(fatDecision.recommendedPathway, 'EXTERNAL_PROCESSOR');
    assert.strictEqual(fatDecision.targetEntityId, 'PROC-GREASE-EXT');

    // Create consignment and confirm with > 3% discrepancy
    const consignment = router.createConsignment({
      externalProcessorId: 'PROC-GREASE-EXT',
      containerIds: ['BIN-BANQUET-FATS'],
      streamType: 'BANQUET_FAT_HEAVY',
      sentWeightKg: 1000,
      vehicleNumber: 'MP-09-GA-1234',
      manifestDocRef: 'DOC-MANIFEST-991',
    });
    assert.strictEqual(consignment.status, 'DISPATCHED');

    const confirmed = router.confirmConsignmentReceipt({
      consignmentId: consignment.consignmentId,
      receivedWeightKg: 940, // 6% loss
    });
    assert.strictEqual(confirmed.discrepancyFlagged, true);
    assert.strictEqual(confirmed.status, 'DISCREPANCY_FLAGGED');
  });

  it('F8: Source Reduction tags causes, normalises per cover and honest savings bounds', () => {
    const sr = new SourceReductionService();

    const now = new Date().toISOString();
    sr.tagBin({
      tagId: 'TAG-1',
      binId: 'BIN-KITCHEN-1',
      outletId: 'OUTLET-MAIN-BUFFET',
      mealPeriod: 'LUNCH',
      cause: 'BUFFET_LEFTOVER',
      weightKg: 85,
      taggedAt: now,
    });
    sr.tagBin({
      tagId: 'TAG-2',
      binId: 'BIN-KITCHEN-2',
      outletId: 'OUTLET-MAIN-BUFFET',
      mealPeriod: 'LUNCH',
      cause: 'BUFFET_LEFTOVER',
      weightKg: 65,
      taggedAt: now,
    });
    sr.tagBin({
      tagId: 'TAG-3',
      binId: 'BIN-KITCHEN-3',
      outletId: 'OUTLET-MAIN-BUFFET',
      mealPeriod: 'LUNCH',
      cause: 'PREPARATION_TRIMMING',
      weightKg: 30,
      taggedAt: now,
    });

    const scorecard = sr.computeOutletScorecard({
      outletId: 'OUTLET-MAIN-BUFFET',
      periodStart: new Date(Date.now() - 3600000).toISOString(),
      periodEnd: new Date(Date.now() + 3600000).toISOString(),
      driverCount: 500, // 500 covers served
      driverType: 'COVERS',
      costPerKgInr: 50,
      baselineWastePerDriverKg: 0.45,
    });

    assert.strictEqual(scorecard.totalWasteKg, 180);
    assert.strictEqual(scorecard.wastePerDriverKg, 0.36); // 180 / 500
    assert.strictEqual(scorecard.isEstimated, true);
    assert.strictEqual(scorecard.topHotspotCause, 'BUFFET_LEFTOVER');
    assert.ok(scorecard.recommendations.some((r) => r.includes('Buffet leftover exceeds 35%')));
  });

  it('F9: Waste Audit Toolkit executes sampling, biohazard stop-rule and CI intervals', () => {
    const audit = new WasteAuditService();

    // Sample 1: Clean organic & cardboard
    audit.recordSample({
      sampleId: 'SMP-1',
      auditPlanId: 'PLAN-Q4-AUDIT',
      sourceLocation: 'BLOCK-A-HOTEL',
      sampledAt: new Date().toISOString(),
      totalMassKg: 100,
      categoryWeights: {
        FOOD_COOKED: 50,
        FOOD_RAW: 25,
        GARDEN_GREEN: 10,
        PAPER_CARDBOARD: 10,
        OTHER_RESIDUAL: 5,
      },
      hasBiomedicalSuspect: false,
    });

    // Sample 2: Biohazard alert triggers stop rule
    const { biohazardAlertTriggered } = audit.recordSample({
      sampleId: 'SMP-2',
      auditPlanId: 'PLAN-Q4-AUDIT',
      sourceLocation: 'BLOCK-B-HOSPITAL-BAY',
      sampledAt: new Date().toISOString(),
      totalMassKg: 50,
      categoryWeights: {
        FOOD_COOKED: 20,
        BIOMEDICAL_SUSPECT: 5,
        OTHER_RESIDUAL: 25,
      },
      hasBiomedicalSuspect: true,
    });
    assert.strictEqual(biohazardAlertTriggered, true);

    const report = audit.generateAuditReport('PLAN-Q4-AUDIT', 'FACILITY-MAIN');
    assert.strictEqual(report.totalSamplesCount, 2);
    assert.ok(report.compostableSharePct > 60);
    assert.ok(report.reportSealHash.length === 64);
  });

  it('F10: Hygiene Zoning enforces color tags, quarantines lots on clean breach and computes integrity', () => {
    const hz = new HygieneZoningService();

    // Red tool in clean zone triggers quarantine on current lot
    const { breach, lotHeldForReview } = hz.reportCrossZoneBreach({
      zoneId: 'ZONE-CLEAN-01',
      toolId: 'FORK-RED-08',
      toolColor: 'RED',
      reportedByUserId: 'USR-SUPERVISOR-VIMAL',
      affectedLotId: 'LOT-BAGGING-99',
    });

    assert.strictEqual(lotHeldForReview, true);
    assert.ok(breach.actionTaken.includes('quarantined pending lab swab'));

    const integrity = hz.getZoneIntegrity('ZONE-CLEAN-01');
    assert.strictEqual(integrity.isCleanZoneCompromised, true);
    assert.ok(integrity.score <= 85); // penalized
  });

  it('F11: Fenceline Odor evaluates wind vectors, sensitive receptors and neighbour liaison', () => {
    const fo = new FencelineOdorService();

    fo.registerPoint({
      pointId: 'PT-BOUNDARY-EAST',
      facilityId: 'FACILITY-TAJ',
      name: 'East Perimeter Near Hospital Ward',
      locationCoords: { x: 90, y: 0 },
      isSensitiveReceptor: true,
      receptorName: 'Apollo Speciality Hospital Ward Wing',
    });

    // Wind blowing towards 90° (East) vetoes turning
    const windCheck = fo.evaluateTurningWindRisk({
      facilityId: 'FACILITY-TAJ',
      windDirectionDegrees: 95,
      windSpeedKmph: 12,
    });
    assert.strictEqual(windCheck.isTurningSafe, false);
    assert.ok(windCheck.warning?.includes('Delay pile turning until wind shifts'));

    // Safe when wind blows away (e.g. 270° West)
    const safeCheck = fo.evaluateTurningWindRisk({
      facilityId: 'FACILITY-TAJ',
      windDirectionDegrees: 270,
      windSpeedKmph: 10,
    });
    assert.strictEqual(safeCheck.isTurningSafe, true);

    // Broadcast neighbour notice
    fo.registerContact({
      contactId: 'CNT-1',
      facilityId: 'FACILITY-TAJ',
      name: 'Apollo Facility Director',
      organizationOrBlock: 'Hospital Admin',
      preferredChannel: 'WHATSAPP',
      contactInfo: '+919876543210',
      consentGranted: true,
    });

    const notice = fo.sendNeighbourNotice({
      facilityId: 'FACILITY-TAJ',
      title: 'Scheduled Compost Screening',
      activityType: 'COMPOST_SCREENING',
      scheduledDate: '2026-10-28',
      messageHindi: 'सावधानी सूचना: कल सुबह 8 से 11 बजे खाद छनाई का कार्य निर्धारित है।',
      messageEnglish: 'Notice: Compost screening is scheduled tomorrow 8-11 AM.',
    });
    assert.strictEqual(notice.recipientsCount, 1);
  });
});
