import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { vol3Routes } from '../src/routes/vol3/index.js';

test('Volume 3 Routes: Fastify plugin registers and mounts all endpoints', async () => {
  const fastify = Fastify();
  await fastify.register(vol3Routes, { prefix: '/api/v1/vol3' });

  // 1. Test receiving gate inspection route
  const gateRes = await fastify.inject({
    method: 'POST',
    url: '/api/v1/vol3/receiving-gate/inspect',
    payload: {
      sourceDepartment: 'Kitchen Wing',
      contaminationLevel: 'NONE',
      contaminantsFound: [],
    },
  });

  assert.equal(gateRes.statusCode, 200);
  const gateJson = gateRes.json();
  assert.equal(gateJson.success, true);
  assert.equal(gateJson.result.decision, 'ACCEPT');

  // 2. Test supreme head deck route
  const deckRes = await fastify.inject({
    method: 'POST',
    url: '/api/v1/vol3/cockpits/supreme-deck',
    payload: {
      asOfDate: '2026-10-26',
      activeFacilitiesCount: 10,
      activeNodesCount: 200,
      totalWetWasteDivertedTons: 500,
      arrLakhsInr: 60,
      fleetUptimePct: 99.5,
      criticalAlertsCount: 0,
      clientNpsScore: 70,
      aiGatewayTokensThousands: 120,
    },
  });

  assert.equal(deckRes.statusCode, 200);
  const deckJson = deckRes.json();
  assert.equal(deckJson.success, true);
  assert.equal(deckJson.deck.sections.length, 8);

  // 3. Test labour standards forecast route
  const labourRes = await fastify.inject({
    method: 'POST',
    url: '/api/v1/vol3/labour-standards/forecast',
    payload: {
      dailyWetWasteTons: 3,
      activePitsCount: 4,
      scheduledHeadcount: 5,
    },
  });

  assert.equal(labourRes.statusCode, 200);
  const labourJson = labourRes.json();
  assert.equal(labourJson.success, true);
  assert.equal(labourJson.result.projectedDailyWetWasteTons, 3);

  await fastify.close();
});
