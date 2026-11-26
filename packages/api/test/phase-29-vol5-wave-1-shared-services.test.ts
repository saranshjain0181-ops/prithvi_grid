import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuthorityMatrixService } from '../src/services/authority-matrix.service';
import { MediaVaultService } from '../src/services/media-vault.service';
import { IntegrationHubService } from '../src/services/integration-hub.service';
import { ActuatorGatewayService } from '../src/services/actuator-gateway.service';
import { PrintSignageService } from '../src/services/print-signage.service';
import { DeviceAppHealthService } from '../src/services/device-app-health.service';

describe('Phase 29: Volume 5 Wave 1 — Shared Services Foundation Tests', () => {
  it('F1: Authority Matrix enforces segregation of duties, delegation and dual approval', () => {
    const auth = new AuthorityMatrixService();

    // 1. Low risk auto-approves
    const autoReq = auth.createApprovalRequest({
      approvalTypeCode: 'LOW_RISK_TASK',
      subjectEntityId: 'PIT-01',
      entityType: 'PIT',
      amountOrSeverity: 1,
      evidenceRefs: [],
      requesterUserId: 'USR-SWEEPER',
    });
    assert.strictEqual(autoReq.status, 'GRANTED');
    assert.strictEqual(autoReq.signOffs.length, 1);

    // 2. High risk PO request
    const poReq = auth.createApprovalRequest({
      approvalTypeCode: 'PURCHASE_ORDER',
      subjectEntityId: 'PO-9001',
      entityType: 'PURCHASE_ORDER',
      amountOrSeverity: 45000,
      evidenceRefs: ['QUOT-SAWDUST-01'],
      requesterUserId: 'USR-SUPERVISOR',
    });
    assert.strictEqual(poReq.status, 'PENDING');

    // Segregation of duties: requester cannot approve own request
    assert.throws(
      () =>
        auth.signOff({
          requestId: poReq.requestId,
          approverUserId: 'USR-SUPERVISOR',
          method: 'PIN',
        }),
      /Segregation of duties violation/
    );

    // Register active delegation: Manager delegates to Deputy
    auth.registerDelegation({
      delegationId: 'DEL-01',
      delegatorUserId: 'USR-MANAGER-AWAY',
      delegateUserId: 'USR-DEPUTY',
      approvalTypeCodes: ['PURCHASE_ORDER'],
      maxLimitValue: 50000,
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
      status: 'ACTIVE',
      auditProof: 'DELEGATION-SEALED-PROOF',
    });

    const res = auth.signOff({
      requestId: poReq.requestId,
      approverUserId: 'USR-DEPUTY',
      actingForUserId: 'USR-MANAGER-AWAY',
      method: 'OTP',
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(poReq.status, 'GRANTED');
    assert.strictEqual(poReq.signOffs[0].actingForUserId, 'USR-MANAGER-AWAY');

    // 3. Critical recall requires dual sign-off
    const recallReq = auth.createApprovalRequest({
      approvalTypeCode: 'BATCH_RECALL',
      subjectEntityId: 'LOT-SALMONELLA-ALERT',
      entityType: 'COMPOST_LOT',
      amountOrSeverity: 1,
      evidenceRefs: ['LAB-REPORT-99'],
      requesterUserId: 'USR-QC',
    });
    assert.strictEqual(recallReq.requiredApproversCount, 2);

    auth.signOff({
      requestId: recallReq.requestId,
      approverUserId: 'USR-AGRONOMIST',
      method: 'PIN',
    });
    assert.strictEqual(recallReq.status, 'PENDING'); // only 1 of 2

    auth.signOff({
      requestId: recallReq.requestId,
      approverUserId: 'USR-FACILITY-HEAD',
      method: 'OTP',
    });
    assert.strictEqual(recallReq.status, 'GRANTED'); // 2 of 2 satisfied
  });

  it('F2: Media Vault enforces retention, legal hold, auto-redaction and de-identification', () => {
    const vault = new MediaVaultService();

    // 1. Personal photo requires auto-redaction
    const { asset: personalAsset, redactionRequired } = vault.uploadMedia({
      sourceFeature: 'GATE_CAMERA',
      linkedEntityId: 'BIN-101',
      linkedEntityType: 'WASTE_BIN',
      rawBufferOrContent: 'RAW_IMAGE_DATA_WITH_PEOPLE',
      classification: 'PERSONAL',
      mimeType: 'image/jpeg',
      tags: ['user:USR-WORKER-RAMESH'],
    });
    assert.strictEqual(redactionRequired, true);

    const redJob = vault.performRedaction({
      assetId: personalAsset.assetId,
      detectedFacesCount: 1,
    });
    assert.strictEqual(redJob.status, 'AUTO_BLURRED');
    assert.strictEqual(personalAsset.isRedacted, true);

    // 2. Legal hold prevents purging expired asset
    vault.applyLegalHold({
      holdId: 'HOLD-01',
      caseRef: 'DISPUTE-CONTAMINATION-01',
      appliedBy: 'COMPLIANCE-LEAD',
      reason: 'Active contractor invoice audit',
      assetIds: [personalAsset.assetId],
    });

    // Advance time past 90 days retention
    const futureTime = Date.now() + 100 * 86400 * 1000;
    const purgeResult = vault.purgeExpiredAssets(futureTime);
    assert.strictEqual(purgeResult.heldCount, 1);
    assert.strictEqual(purgeResult.purgedAssetIds.length, 0);

    // 3. GDPR Data Subject Deletion preserves sealed cryptographic evidence
    const { asset: evidenceAsset } = vault.uploadMedia({
      sourceFeature: 'LETHALITY_LEDGER',
      linkedEntityId: 'BATCH-44',
      linkedEntityType: 'BATCH',
      rawBufferOrContent: 'SEALED_EVIDENCE_FOR_LOT',
      classification: 'EVIDENCE',
      mimeType: 'application/pdf',
      tags: ['user:USR-WORKER-RAMESH'],
    });
    assert.strictEqual(evidenceAsset.isSealed, true);

    const delRes = vault.fulfillDataSubjectDeletion('USR-WORKER-RAMESH');
    assert.strictEqual(delRes.pseudonymizedSeals, 1);
    assert.ok(evidenceAsset.tags.includes('subject:DEIDENTIFIED_GDPR_ACT'));
    assert.ok(!evidenceAsset.tags.includes('user:USR-WORKER-RAMESH'));
  });

  it('F3: Integration Hub stages external payloads, catches row errors and signs webhooks', () => {
    const hub = new IntegrationHubService();

    hub.registerConnector({
      connectorId: 'CONN-HOTEL-BANQUET',
      tenantId: 'TENANT-TAJ',
      name: 'Taj Palace PMS Feed',
      type: 'FILE_DROP',
      endpointOrPath: '/incoming/banquets.csv',
      secretKeyRef: 'SECRET_PMS_KEY',
      dataScope: 'BANQUET_BOOKINGS',
      isActive: true,
      rateLimitPerMin: 60,
    });

    hub.saveMapping({
      mappingId: 'MAP-BANQUET',
      connectorId: 'CONN-HOTEL-BANQUET',
      targetEntity: 'BANQUET_EVENT',
      fieldMap: {
        bookingId: 'externalId',
        eventDate: 'date',
        expectedGuests: 'guestCount',
        wasteEstimateKg: 'wasteTonnes',
      },
      transforms: {
        date: 'PARSE_DATE',
        wasteTonnes: 'KG_TO_TONNES',
      },
      version: 1,
      status: 'APPROVED',
    });

    const rawRows = [
      { bookingId: 'BK-101', eventDate: '2026-11-01', expectedGuests: 450, wasteEstimateKg: 600 },
      { bookingId: 'BK-102', eventDate: 'INVALID_DATE', expectedGuests: 200, wasteEstimateKg: 250 }, // Error
      { bookingId: 'BK-103', eventDate: '2026-11-05', expectedGuests: 800 }, // Missing wasteEstimateKg
    ];

    const { run, staged, validCount, errorCount } = hub.executeStagedImport({
      connectorId: 'CONN-HOTEL-BANQUET',
      mappingId: 'MAP-BANQUET',
      rawRows,
    });

    assert.strictEqual(validCount, 1);
    assert.strictEqual(errorCount, 2);
    assert.strictEqual(run.status, 'PARTIAL');
    assert.strictEqual(staged[0].transformedPayload?.wasteTonnes, 0.6); // 600 kg -> 0.6 tonnes

    const applied = hub.applyStagedRun(run.runId);
    assert.strictEqual(applied.appliedCount, 1);
    assert.strictEqual(applied.rejectedCount, 2);

    // Outbound Webhook HMAC signing
    hub.registerOutboundSubscription({
      subscriptionId: 'SUB-ERP',
      tenantId: 'TENANT-TAJ',
      targetWebhookUrl: 'https://erp.tajhotels.com/api/prithvi-feed',
      subscribedEvents: ['batch.released'],
      secretSignatureKey: 'super-secret-hmac-key',
      retryMaxCount: 3,
      isActive: true,
    });

    const webhook = hub.generateOutboundWebhook('SUB-ERP', 'batch.released', { lot: 'LOT-99', kg: 1200 });
    assert.ok(webhook.headers['X-Prithvi-Signature']);
    assert.strictEqual(webhook.headers['X-Prithvi-Event'], 'batch.released');
  });

  it('F4: Field Actuator Gateway enforces safety modes, interlocks and current monitoring', () => {
    const gateway = new ActuatorGatewayService();

    gateway.registerActuator({
      actuatorId: 'ACT-BLOWER-01',
      siteId: 'SITE-HOTEL-01',
      name: 'Aeration Blower Pit 1',
      type: 'AERATION_BLOWER',
      controllerId: 'CTRL-ESP32-RELAY-1',
      currentMode: 'ADVISORY',
      maxRunSecondsPerCommand: 600, // 10 mins
      dailyMaxSecondsBudget: 3600,
      currentDailySecondsUsed: 0,
      status: 'ONLINE',
      manualOverrideActive: false,
    });

    // Cannot transition to AUTOMATIC without electrical safety cert
    assert.throws(
      () =>
        gateway.transitionMode({
          actuatorId: 'ACT-BLOWER-01',
          targetMode: 'AUTOMATIC',
          approvedByAuthorityMatrix: true,
        }),
      /recorded electrical safety certification/
    );

    // Transition with cert
    gateway.transitionMode({
      actuatorId: 'ACT-BLOWER-01',
      targetMode: 'AUTOMATIC',
      approvedByAuthorityMatrix: true,
      electricalSafetyCertId: 'ELEC-CERT-2026-99',
    });

    // Register Interlock: Worker standing at pit vetoes blower
    gateway.registerInterlock({
      interlockId: 'INT-WORKER-PRESENT',
      actuatorId: 'ACT-BLOWER-01',
      name: 'Worker Presence Interlock',
      description: 'Never operate blower while worker is at pit',
      isTriggered: (ctx) => ctx.workerAtPit === true,
      severity: 'BLOCKING',
    });

    // Command when worker is present -> Vetoed
    const vetoedCmd = gateway.dispatchCommand({
      actuatorId: 'ACT-BLOWER-01',
      idempotencyKey: 'CMD-KEY-1',
      targetDurationSeconds: 300,
      context: { workerAtPit: true },
    });
    assert.strictEqual(vetoedCmd.status, 'VETOED_INTERLOCK');

    // Command when safe -> Sent
    const safeCmd = gateway.dispatchCommand({
      actuatorId: 'ACT-BLOWER-01',
      idempotencyKey: 'CMD-KEY-2',
      targetDurationSeconds: 300,
      context: { workerAtPit: false },
    });
    assert.strictEqual(safeCmd.status, 'SENT');

    // Confirm execution with current sensor reading 0 amps -> Detects FAULT
    const faulted = gateway.confirmCommandExecution({
      commandId: safeCmd.commandId,
      measuredCurrentAmps: 0.0,
    });
    assert.strictEqual(faulted.status, 'FAULT');

    // Physical manual switch overrides all software commands
    gateway.setManualOverride('ACT-BLOWER-01', true);
    const overriddenCmd = gateway.dispatchCommand({
      actuatorId: 'ACT-BLOWER-01',
      idempotencyKey: 'CMD-KEY-3',
      targetDurationSeconds: 300,
      context: { workerAtPit: false },
    });
    assert.strictEqual(overriddenCmd.status, 'OVERRIDDEN_MANUAL');
  });

  it('F5: Print and Signage Studio enforces regulated label reviews and sign replacement', () => {
    const studio = new PrintSignageService();

    // Regulated template must have passed legal review
    assert.throws(
      () =>
        studio.registerTemplate({
          templateId: 'TPL-ORGANIC-FERT-LABEL',
          category: 'BAG_LABEL',
          name: 'Organic Fertilizer Export Label',
          version: 1,
          languages: ['en'],
          dimensionsMm: { width: 100, height: 100 },
          requiredFields: ['lotNumber'],
          qrDeepLinkPattern: 'https://app.prithvigrid.com/cert/{lotNumber}',
          isRegulated: true,
          legalReviewPassed: false, // Fails check
        }),
      /requires legalReviewPassed: true/
    );

    // Place sign on site map
    const sign = studio.placeSign({
      templateId: 'TPL-PIT-PLATE',
      entityId: 'PIT-05',
      locationCoords: { x: 12.5, y: 34.0, zone: 'RAW_ZONE' },
    });
    assert.strictEqual(sign.isOutdated, false);

    // When SOP changes, flag sign as outdated
    const outdated = studio.flagOutdatedSigns('PIT-05', 'Emergency contact phone numbers updated');
    assert.strictEqual(outdated.length, 1);
    assert.strictEqual(outdated[0].isOutdated, true);

    // QR scanner verification test
    const scanTest = studio.validateQrScan('https://app.prithvigrid.com/p/PIT-05');
    assert.strictEqual(scanTest.isDecodable, true);
    assert.strictEqual(scanTest.resolvedEntityId, 'PIT-05');
  });

  it('F6: Field Device and App Health detects clock drift, stuck offline queue and version policies', () => {
    const devHealth = new DeviceAppHealthService();

    devHealth.enrollDevice({
      deviceId: 'DEV-KIOSK-01',
      tenantId: 'TENANT-APOLLO',
      facilityId: 'FACILITY-MAIN-YARD',
      deviceRole: 'KIOSK',
      appVersion: '2.4.0',
      osVersion: 'Android 13',
    });

    devHealth.registerMinVersionPolicy({
      tenantId: 'TENANT-APOLLO',
      minAppVersion: '2.5.0',
      recommendedVersion: '2.6.0',
      enforceBlockBefore: '2026-11-01',
    });

    // Heartbeat with outdated app version and 4-minute clock drift
    const { healthState, alerts } = devHealth.recordHeartbeat({
      deviceId: 'DEV-KIOSK-01',
      freeStorageMb: 450,
      batteryPct: 98,
      networkType: 'WIFI',
      offlineQueueLength: 5,
      oldestQueueItemHours: 0.2,
      serverClockOffsetMs: 240000, // +4 minutes drift
      lastSuccessfulSyncAt: new Date().toISOString(),
    });

    assert.strictEqual(healthState, 'UNHEALTHY');
    assert.ok(alerts.some((a) => a.includes('Critical clock drift')));
    assert.ok(alerts.some((a) => a.includes('below minimum requirement')));

    // Issue remote action to force update
    const remoteAct = devHealth.issueRemoteAction({
      deviceId: 'DEV-KIOSK-01',
      actionType: 'REQUIRE_UPDATE',
    });
    assert.strictEqual(remoteAct.status, 'PENDING');
  });
});
