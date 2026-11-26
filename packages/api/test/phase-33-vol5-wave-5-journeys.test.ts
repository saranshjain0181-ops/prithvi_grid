import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuthorityMatrixService } from '../src/services/authority-matrix.service';
import { MediaVaultService } from '../src/services/media-vault.service';
import { IntegrationHubService } from '../src/services/integration-hub.service';
import { ActuatorGatewayService } from '../src/services/actuator-gateway.service';
import { PrintSignageService } from '../src/services/print-signage.service';
import { DeviceAppHealthService } from '../src/services/device-app-health.service';
import { PathwayRouterService } from '../src/services/pathway-router.service';
import { SourceReductionService } from '../src/services/source-reduction.service';
import { HygieneZoningService } from '../src/services/hygiene-zoning.service';
import { ComplaintRecallService } from '../src/services/complaint-recall.service';
import { PracticePitService } from '../src/services/practice-pit.service';
import { OperatingRhythmService } from '../src/services/operating-rhythm.service';

describe('Phase 33: Volume 5 Wave 5 — Cross-Feature Integration Journeys Tests (Appendix C)', () => {
  it('Journey 1: Delegated purchase routes to deputy with active delegation and OTP seal', () => {
    const auth = new AuthorityMatrixService();

    // Supervisor raises 45,000 INR tarpaulin request
    const poReq = auth.createApprovalRequest({
      approvalTypeCode: 'PURCHASE_ORDER',
      subjectEntityId: 'PO-TARPAULIN-01',
      entityType: 'PURCHASE_ORDER',
      amountOrSeverity: 45000,
      evidenceRefs: ['QUOT-TARP-45K'],
      requesterUserId: 'USR-SUPERVISOR-ANIL',
    });
    assert.strictEqual(poReq.status, 'PENDING');

    // Register active delegation for travelling client head to deputy
    auth.registerDelegation({
      delegationId: 'DEL-TRAVEL-01',
      delegatorUserId: 'USR-CLIENT-HEAD-TRAVELING',
      delegateUserId: 'USR-DEPUTY-HEAD',
      approvalTypeCodes: ['PURCHASE_ORDER'],
      maxLimitValue: 100000,
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'ACTIVE',
      auditProof: 'DELEGATION-SEAL-PROOF-01',
    });

    const signResult = auth.signOff({
      requestId: poReq.requestId,
      approverUserId: 'USR-DEPUTY-HEAD',
      actingForUserId: 'USR-CLIENT-HEAD-TRAVELING',
      method: 'OTP',
    });

    assert.strictEqual(signResult.success, true);
    assert.strictEqual(poReq.status, 'GRANTED');
    assert.strictEqual(poReq.signOffs[0].actingForUserId, 'USR-CLIENT-HEAD-TRAVELING');
    assert.ok(poReq.signOffs[0].sealHash.length === 64);
  });

  it('Journey 2: Media lifecycle redacts personal face, preserves legal hold and fulfills deletion', () => {
    const vault = new MediaVaultService();

    // 1. Worker photographs bin with colleague in frame
    const { asset, redactionRequired } = vault.uploadMedia({
      sourceFeature: 'GATE_INSPECTION',
      linkedEntityId: 'BIN-HOTEL-44',
      linkedEntityType: 'BIN',
      rawBufferOrContent: 'RAW_IMAGE_DATA_WITH_FACE',
      classification: 'PERSONAL',
      mimeType: 'image/jpeg',
      tags: ['user:USR-WORKER-RAMU'],
    });
    assert.strictEqual(redactionRequired, true);

    const redJob = vault.performRedaction({
      assetId: asset.assetId,
      detectedFacesCount: 1,
    });
    assert.strictEqual(redJob.status, 'AUTO_BLURRED');
    assert.strictEqual(asset.isRedacted, true);

    // 2. Dispute places legal hold
    vault.applyLegalHold({
      holdId: 'HOLD-DISPUTE-01',
      caseRef: 'CASE-HOTEL-44',
      appliedBy: 'USR-COMPLIANCE',
      reason: 'Contamination liability claim',
      assetIds: [asset.assetId],
    });

    // 3. Purge past retention cannot delete held asset
    const purge = vault.purgeExpiredAssets(Date.now() + 100 * 86400 * 1000);
    assert.strictEqual(purge.heldCount, 1);
    assert.strictEqual(purge.purgedAssetIds.length, 0);

    // 4. Data subject deletion pseudonymises tags to preserve cryptographic seal
    const del = vault.fulfillDataSubjectDeletion('USR-WORKER-RAMU');
    assert.strictEqual(del.anonymizedCount, 1);
  });

  it('Journey 3: Hotel import stages spreadsheet, isolates malformed rows and signs outbound webhooks', () => {
    const hub = new IntegrationHubService();

    hub.registerConnector({
      connectorId: 'CONN-TAJ-PMS',
      tenantId: 'TENANT-TAJ',
      name: 'Taj Banquet CSV Feed',
      type: 'FILE_DROP',
      endpointOrPath: '/feeds/banquets.csv',
      secretKeyRef: 'SECRET_TAJ',
      dataScope: 'BANQUET_BOOKINGS',
      isActive: true,
      rateLimitPerMin: 30,
    });

    hub.saveMapping({
      mappingId: 'MAP-BANQUETS',
      connectorId: 'CONN-TAJ-PMS',
      targetEntity: 'BANQUET_EVENT',
      fieldMap: { id: 'bookingRef', eventDate: 'date', wasteKg: 'wasteTonnes' },
      transforms: { date: 'PARSE_DATE', wasteTonnes: 'KG_TO_TONNES' },
      version: 1,
      status: 'APPROVED',
    });

    const rows = [
      { id: 'EV-100', eventDate: '2026-11-04', wasteKg: 500 },
      { id: 'EV-101', eventDate: 'BAD_DATE', wasteKg: 300 }, // Malformed
    ];

    const { run, staged, validCount, errorCount } = hub.executeStagedImport({
      connectorId: 'CONN-TAJ-PMS',
      mappingId: 'MAP-BANQUETS',
      rawRows: rows,
    });

    assert.strictEqual(validCount, 1);
    assert.strictEqual(errorCount, 1);
    assert.strictEqual(run.status, 'PARTIAL');

    const apply = hub.applyStagedRun(run.runId);
    assert.strictEqual(apply.appliedCount, 1);
    assert.strictEqual(apply.rejectedCount, 1);
  });

  it('Journey 4: Automation in stages requires cert, respects interlocks and current monitoring', () => {
    const gateway = new ActuatorGatewayService();

    gateway.registerActuator({
      actuatorId: 'ACT-BLOWER-PIT3',
      siteId: 'SITE-01',
      name: 'Blower Pit 3',
      type: 'AERATION_BLOWER',
      controllerId: 'CTRL-01',
      currentMode: 'ADVISORY',
      maxRunSecondsPerCommand: 600,
      dailyMaxSecondsBudget: 3600,
      currentDailySecondsUsed: 0,
      status: 'ONLINE',
      manualOverrideActive: false,
    });

    // Transition to AUTOMATIC
    gateway.transitionMode({
      actuatorId: 'ACT-BLOWER-PIT3',
      targetMode: 'AUTOMATIC',
      approvedByAuthorityMatrix: true,
      electricalSafetyCertId: 'CERT-ELEC-440',
    });

    // Interlock: High rain vetoes aeration
    gateway.registerInterlock({
      interlockId: 'INT-RAIN',
      actuatorId: 'ACT-BLOWER-PIT3',
      name: 'Rain Interlock',
      description: 'Veto blower during heavy rainfall',
      isTriggered: (ctx) => ctx.rainfallMmPerHour > 15,
      severity: 'BLOCKING',
    });

    const rainCmd = gateway.dispatchCommand({
      actuatorId: 'ACT-BLOWER-PIT3',
      idempotencyKey: 'CMD-RAIN-1',
      targetDurationSeconds: 300,
      context: { rainfallMmPerHour: 22 },
    });
    assert.strictEqual(rainCmd.status, 'VETOED_INTERLOCK');

    const safeCmd = gateway.dispatchCommand({
      actuatorId: 'ACT-BLOWER-PIT3',
      idempotencyKey: 'CMD-SAFE-1',
      targetDurationSeconds: 300,
      context: { rainfallMmPerHour: 0 },
    });
    assert.strictEqual(safeCmd.status, 'SENT');

    // Confirm with valid amperage
    const confirmed = gateway.confirmCommandExecution({
      commandId: safeCmd.commandId,
      measuredCurrentAmps: 4.8,
    });
    assert.strictEqual(confirmed.status, 'CONFIRMED');
    assert.strictEqual(confirmed.measuredCurrentAmps, 4.8);
  });

  it('Journey 5: Print and reprint flags outdated signs when emergency contacts change', () => {
    const studio = new PrintSignageService();

    const sign = studio.placeSign({
      templateId: 'TPL-SAFETY-POSTER',
      entityId: 'ZONE-A-RECEIVING',
      locationCoords: { x: 10, y: 15, zone: 'RAW_ZONE' },
    });
    assert.strictEqual(sign.isOutdated, false);

    const outdated = studio.flagOutdatedSigns('ZONE-A-RECEIVING', 'Emergency hospital phone number updated');
    assert.strictEqual(outdated.length, 1);
    assert.strictEqual(outdated[0].isOutdated, true);
  });

  it('Journey 6: Kiosk clock drift flags UNHEALTHY state and issues remote sync action', () => {
    const dev = new DeviceAppHealthService();

    dev.enrollDevice({
      deviceId: 'KIOSK-CURE-AREA',
      tenantId: 'TENANT-01',
      facilityId: 'FACILITY-MAIN',
      deviceRole: 'KIOSK',
      appVersion: '2.5.0',
      osVersion: 'Android 12',
    });

    const { healthState, alerts } = dev.recordHeartbeat({
      deviceId: 'KIOSK-CURE-AREA',
      freeStorageMb: 800,
      batteryPct: 100,
      networkType: 'WIFI',
      offlineQueueLength: 2,
      oldestQueueItemHours: 0.1,
      serverClockOffsetMs: 300000, // 5 minutes drift!
      lastSuccessfulSyncAt: new Date().toISOString(),
    });

    assert.strictEqual(healthState, 'UNHEALTHY');
    assert.ok(alerts.some((a) => a.includes('Critical clock drift')));

    const act = dev.issueRemoteAction({
      deviceId: 'KIOSK-CURE-AREA',
      actionType: 'FORCE_SYNC',
    });
    assert.strictEqual(act.status, 'PENDING');
  });

  it('Journey 7: Surge routing handles festival overflow via external processor and checks discrepancies', () => {
    const router = new PathwayRouterService();

    router.registerExternalProcessor({
      processorId: 'PROC-BIOENERGY-01',
      name: 'BioEnergy Solutions Indore',
      licenseNumber: 'MPPCB-2026-99',
      licenseExpiresAt: new Date(Date.now() + 86400000 * 180).toISOString(),
      acceptedStreams: ['FESTIVAL_SWEETS_GREASE'],
      maxDailyCapacityKg: 5000,
      ratePerKgInr: 2.0,
      isActive: true,
    });

    const route = router.routeContainer({
      containerId: 'BIN-FESTIVAL-OVERFLOW',
      streamType: 'FESTIVAL_SWEETS_GREASE',
      massKg: 1200,
      hasBiomedicalHazard: false,
      onSitePitAvailableCapacityKg: 400, // Deficit!
      isFatOrOilHeavy: true,
    });
    assert.strictEqual(route.recommendedPathway, 'EXTERNAL_PROCESSOR');

    const consignment = router.createConsignment({
      externalProcessorId: 'PROC-BIOENERGY-01',
      containerIds: ['BIN-FESTIVAL-OVERFLOW'],
      streamType: 'FESTIVAL_SWEETS_GREASE',
      sentWeightKg: 1200,
      vehicleNumber: 'MP-09-XX-9999',
      manifestDocRef: 'DOC-FESTIVAL-99',
    });

    const receipt = router.confirmConsignmentReceipt({
      consignmentId: consignment.consignmentId,
      receivedWeightKg: 1190, // Within 3% tolerance
    });
    assert.strictEqual(receipt.discrepancyFlagged, false);
    assert.strictEqual(receipt.status, 'CONFIRMED');
  });

  it('Journey 8: Source reduction tags causes and calculates food waste cost savings', () => {
    const sr = new SourceReductionService();

    sr.tagBin({
      tagId: 'T-1',
      binId: 'B-1',
      outletId: 'OUTLET-BUFFET-SUNDAY',
      mealPeriod: 'LUNCH',
      cause: 'BUFFET_LEFTOVER',
      weightKg: 120,
      taggedAt: new Date().toISOString(),
    });

    const scorecard = sr.computeOutletScorecard({
      outletId: 'OUTLET-BUFFET-SUNDAY',
      periodStart: new Date(Date.now() - 3600000).toISOString(),
      periodEnd: new Date(Date.now() + 3600000).toISOString(),
      driverCount: 300,
      driverType: 'COVERS',
      costPerKgInr: 60,
      baselineWastePerDriverKg: 0.5,
    });

    assert.strictEqual(scorecard.totalWasteKg, 120);
    assert.strictEqual(scorecard.wastePerDriverKg, 0.4); // 120 / 300
    assert.strictEqual(scorecard.isEstimated, true);
    assert.ok(scorecard.estimatedFoodCostSavedInr > 0);
  });

  it('Journey 9: Hygiene breach quarantines affected lot and penalizes zone integrity', () => {
    const hz = new HygieneZoningService();

    const { breach, lotHeldForReview } = hz.reportCrossZoneBreach({
      zoneId: 'ZONE-CLEAN-01',
      toolId: 'SHOVEL-RAW-02',
      toolColor: 'RED',
      reportedByUserId: 'USR-QC-INSPECTOR',
      affectedLotId: 'LOT-BAGGED-BATCH-88',
    });

    assert.strictEqual(lotHeldForReview, true);
    assert.strictEqual(breach.expectedColor, 'GREEN');

    const integrity = hz.getZoneIntegrity('ZONE-CLEAN-01');
    assert.strictEqual(integrity.isCleanZoneCompromised, true);
  });

  it('Journey 10: Complaint to recall triggers containment and dual independent approval', () => {
    const cr = new ComplaintRecallService();

    const { complaint, quarantine } = cr.registerComplaint({
      lotNumber: 'LOT-PLASTIC-ALERT',
      sourceType: 'BUYER',
      severity: 'SAFETY_ISSUE',
      description: 'Plastic fragments in compost bags',
      foreignContaminant: 'PLASTIC',
      stockHeldKg: 2000,
    });

    assert.strictEqual(complaint.status, 'QUARANTINED');
    assert.strictEqual(quarantine?.status, 'ACTIVE');

    const recall = cr.initiateRecall({
      lotNumber: 'LOT-PLASTIC-ALERT',
      approverUserIds: ['USR-QUALITY-DIR', 'USR-LEGAL-HEAD'],
      totalKgSubjectToRecall: 2000,
    });

    assert.strictEqual(recall.status, 'INITIATED');
    assert.strictEqual(quarantine?.status, 'RECALLED');
  });

  it('Journey 11: Practice pit simulator models acid crash recovery and debrief feedback', () => {
    const sim = new PracticePitService();

    const run = sim.executeSimRun({
      traineeUserId: 'USR-TRAINEE-SITA',
      scenarioId: 'SCEN-ACID-CRASH',
      actionSequence: ['ADD_BULKING_DRY', 'DO_NOTHING', 'TURN_PILE'],
    });

    assert.strictEqual(run.isSuccessfullyRecovered, true);
    assert.ok(run.scorePct >= 90);
  });

  it('Journey 12: Review to action snapshots planning widgets and escalates overdue actions', () => {
    const rhythm = new OperatingRhythmService();

    const meeting = rhythm.conductMeeting({
      facilityId: 'FACILITY-MAIN',
      cadence: 'WEEKLY_OPS_REVIEW',
      title: 'Operations Review Week 44',
      agendaItems: [
        {
          itemId: 'ITEM-1',
          title: 'Planning Board Capacity',
          boundWidgetId: 'WIDGET-PLAN-HEALTH',
          snapshotDataRef: 'SNAP-PLAN-W44',
        },
      ],
      decisionsTaken: ['Procure additional bulking sawdust'],
      newActions: [
        {
          title: 'Deliver 5 tonnes dry pine shavings',
          assignedToUserId: 'USR-SUPPLIER-LEAD',
          dueDate: new Date(Date.now() - 7200000).toISOString(), // Past due
        },
      ],
    });

    assert.strictEqual(meeting.agendaItems[0].boundWidgetId, 'WIDGET-PLAN-HEALTH');

    const overdue = rhythm.getOverdueActions();
    assert.strictEqual(overdue.length, 1);
    assert.strictEqual(overdue[0].status, 'ESCALATED');
  });
});
