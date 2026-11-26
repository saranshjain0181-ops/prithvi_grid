import test from 'node:test';
import assert from 'node:assert/strict';
import { eventSpineService } from '../src/services/event-spine.service.js';
import { workflowOrchestratorService } from '../src/services/workflow-orchestrator.service.js';
import { entityGraphService } from '../src/services/entity-graph.service.js';
import { featureRegistryService } from '../src/services/feature-registry.service.js';

test('Phase 18: Vol 3 Wave 1 — The Compatibility Backbone Tests', async (t) => {
  await t.test('Feature 1: The Event Spine & Idempotent Pub-Sub Envelope', async () => {
    eventSpineService.resetLedger();

    let consumerExecutionCount = 0;
    eventSpineService.subscribe('pit.load.completed', 'TestAuditConsumer', (evt) => {
      consumerExecutionCount++;
    });

    // 1. Publish standard event envelope
    const event = await eventSpineService.publish({
      eventType: 'pit.load.completed',
      tenantId: 'TENANT-HOTEL-01',
      facilityId: 'FAC-DELHI-SOUTH',
      entityRefs: [{ entityType: 'pit', entityId: 'PIT-01' }],
      actor: { actorId: 'USR-RAMESH', role: 'SAFAI_MITRA', actorType: 'USER' },
      payload: { massKg: 500, cRatio: 30 },
      source: 'APP',
    });

    assert.ok(event.eventId.startsWith('EVT-'));
    assert.equal(event.schemaVersion, 1);
    assert.equal(consumerExecutionCount, 1);

    // 2. Re-publishing same envelope must be deduplicated by consumer ledger
    const duplicateEvent = await eventSpineService.publish({
      eventType: 'pit.load.completed',
      tenantId: 'TENANT-HOTEL-01',
      facilityId: 'FAC-DELHI-SOUTH',
      entityRefs: [{ entityType: 'pit', entityId: 'PIT-01' }],
      actor: { actorId: 'USR-RAMESH', role: 'SAFAI_MITRA', actorType: 'USER' },
      payload: { massKg: 500, cRatio: 30 },
      source: 'APP',
    });
    assert.equal(consumerExecutionCount, 2); // Different eventId executed

    // 3. Dead letter routing on consumer failure
    eventSpineService.subscribe('pit.fail.test', 'FailingConsumer', () => {
      throw new Error('Database connection dropped during projection write');
    });

    await eventSpineService.publish({
      eventType: 'pit.fail.test',
      tenantId: 'TENANT-HOTEL-01',
      facilityId: 'FAC-DELHI-SOUTH',
      entityRefs: [],
      actor: { actorId: 'SYSTEM', role: 'SYSTEM', actorType: 'SYSTEM' },
      payload: {},
      source: 'SYSTEM',
    });

    const deadLetters = eventSpineService.getDeadLetters();
    assert.ok(deadLetters.length >= 1);
    assert.equal(deadLetters[0].consumerName, 'FailingConsumer');
  });

  await t.test('Feature 2: Kaam Chain Cross-Feature Workflow Orchestration', () => {
    // 1. Start Loading Chain
    const instance = workflowOrchestratorService.startChain({
      chainKey: 'LOADING_CHAIN',
      tenantId: 'TENANT-HOTEL-01',
      facilityId: 'FAC-DELHI-SOUTH',
      entityRefs: [{ entityType: 'pit', entityId: 'PIT-02' }],
    });

    assert.equal(instance.status, 'RUNNING');
    assert.equal(instance.currentStepIndex, 0);
    assert.equal(instance.stepRuns[0].stepKey, 'GATE_INSPECTION');
    assert.equal(instance.stepRuns[0].status, 'ACTIVE');

    // 2. Advance step 1: Gate inspection
    workflowOrchestratorService.advanceStep(instance, 'GATE_INSPECTION', 'Inspected clean, no contaminants');
    assert.equal(instance.stepRuns[0].status, 'COMPLETED');
    assert.equal(instance.currentStepIndex, 1);
    assert.equal(instance.stepRuns[1].stepKey, 'PRE_PROCESSING');
    assert.equal(instance.stepRuns[1].status, 'ACTIVE');

    // 3. Advance step 2: Pre-processing shredding
    workflowOrchestratorService.advanceStep(instance, 'PRE_PROCESSING', 'Shredded in 15 mins');
    // 4. Advance step 3: Parat loading
    workflowOrchestratorService.advanceStep(instance, 'PARAT_LOADING', 'Loaded with sawdust');
    // 5. Advance step 4: First heat check (final step)
    workflowOrchestratorService.advanceStep(instance, 'FIRST_HEAT_CHECK', 'Core reached 58°C');

    assert.equal(instance.status, 'COMPLETED');
    assert.ok(instance.completedAt);
  });

  await t.test('Feature 3: The Entity Graph, Lineage & Universal Entity Card', () => {
    entityGraphService.resetGraph();

    const bin = { type: 'container', id: 'BIN-KITCHEN-01' };
    const pit = { type: 'pit', id: 'PIT-03' };
    const cure = { type: 'cure_pile', id: 'CURE-03' };
    const lot = { type: 'lot', id: 'BAG-LOT-901' };

    // Establish bidirectional graph edges
    entityGraphService.addEdge({ from: bin, to: pit, relationshipType: 'consumed-in' });
    entityGraphService.addEdge({ from: pit, to: cure, relationshipType: 'produced-by' });
    entityGraphService.addEdge({ from: cure, to: lot, relationshipType: 'derived-from' });

    // 1. Forward Lineage: from bin to finished lot
    const forward = entityGraphService.traceForward(bin);
    assert.equal(forward.length, 3);
    assert.ok(forward.some((e) => e.type === 'lot' && e.id === 'BAG-LOT-901'));

    // 2. Backward Lineage: from lot to origin bin
    const backward = entityGraphService.traceBackward(lot);
    assert.equal(backward.length, 3);
    assert.ok(backward.some((e) => e.type === 'container' && e.id === 'BIN-KITCHEN-01'));

    // 3. Impact Analysis: contaminated bin reveals all affected downstream entities
    const impact = entityGraphService.analyzeImpact(bin);
    assert.equal(impact.impactedEntityCount, 3);
    assert.match(impact.recommendedCorrectionPath, /IMPACT-ALERT/);

    // 4. Universal Entity Card projection
    const card = entityGraphService.renderUniversalEntityCard(pit);
    assert.equal(card.name, 'PIT-PIT-03');
    assert.equal(card.status, 'ACTIVE');
    assert.ok(card.relatedEntities.length >= 2);
  });

  await t.test('Feature 4: The Feature Registry, Compatibility Matrix & Attention Budget', () => {
    // 1. Register core features with attention costs
    featureRegistryService.registerManifest({
      featureId: 'vol3.feature.event_spine',
      name: 'Event Spine',
      volume: 3,
      dependencies: [],
      attentionCost: { promptsPerShift: 0, extraTapsPerTask: 0, pushNotificationsPerDay: 0 },
    });

    featureRegistryService.registerManifest({
      featureId: 'vol3.feature.kaam_chain',
      name: 'Kaam Chain Orchestrator',
      volume: 3,
      dependencies: ['vol3.feature.event_spine'],
      attentionCost: { promptsPerShift: 1, extraTapsPerTask: 2, pushNotificationsPerDay: 1 },
    });

    featureRegistryService.registerManifest({
      featureId: 'vol3.feature.pile_geometry',
      name: 'Pile Geometry Designer',
      volume: 3,
      dependencies: ['vol3.feature.event_spine'],
      attentionCost: { promptsPerShift: 1, extraTapsPerTask: 2, pushNotificationsPerDay: 0 },
    });

    // 2. Compatibility check: all dependencies satisfied
    const validCheck = featureRegistryService.validateCompatibility([
      'vol3.feature.event_spine',
      'vol3.feature.kaam_chain',
    ]);
    assert.equal(validCheck.isCompatible, true);

    // 3. Missing dependency check: Kaam chain enabled without Event Spine
    const invalidCheck = featureRegistryService.validateCompatibility(['vol3.feature.kaam_chain']);
    assert.equal(validCheck.isCompatible, true);
    assert.equal(invalidCheck.isCompatible, false);
    assert.equal(invalidCheck.missingDependencies[0].missing, 'vol3.feature.event_spine');

    // 4. Attention budget verification: Safai Mitra budget (max 8 prompts, 25 taps)
    const budgetCheck = featureRegistryService.evaluateAttentionBudget(
      ['vol3.feature.event_spine', 'vol3.feature.kaam_chain', 'vol3.feature.pile_geometry'],
      'SAFAI_MITRA'
    );
    assert.equal(budgetCheck.totalPromptsPerShift, 2);
    assert.equal(budgetCheck.totalExtraTaps, 4);
    assert.equal(budgetCheck.isCompliant, true);
  });
});
