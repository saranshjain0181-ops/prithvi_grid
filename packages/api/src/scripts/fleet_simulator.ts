import crypto from 'crypto';
import { connectDatabase } from '../db/mongoose';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { FacilityLocation } from '../db/models/FacilityLocation';
import { GlobalEntity } from '../db/models/GlobalEntity';

interface SimulatedNodeConfig {
  nodeId: string;
  deviceKey: string;
  name: string;
  scenario: 'healthy' | 'acid_crash' | 'odor_risk';
  state: {
    tempC: number;
    moisturePct: number;
    ph: number;
    methanePpm: number;
    airPressureHpa: number;
    batteryMv: number;
    signalRssi: number;
  };
}

async function ensureSimulatorNodes(): Promise<SimulatedNodeConfig[]> {
  await connectDatabase();

  let entity = await GlobalEntity.findOne();
  if (!entity) {
    entity = await GlobalEntity.create({
      name: 'Indore Municipal Corporation (IMC)',
      type: 'GOVERNMENT_BODY',
      isActive: true,
    });
  }

  let facility = await FacilityLocation.findOne({ entityId: entity._id });
  if (!facility) {
    facility = await FacilityLocation.create({
      entityId: entity._id,
      facilityName: 'Palasia Bio-Methanization Plant',
      code: 'IND-PAL-01',
      gpsLat: 22.7196,
      gpsLong: 75.8577,
    });
  }

  const configs: Array<{ name: string; scenario: SimulatedNodeConfig['scenario']; key: string }> = [
    { name: 'Smart Spear Alpha (Aerobic)', scenario: 'healthy', key: 'device-key-alpha' },
    { name: 'Smart Spear Beta (Acid Stalled)', scenario: 'acid_crash', key: 'device-key-beta' },
    { name: 'Smart Spear Gamma (Compacted Odor)', scenario: 'odor_risk', key: 'device-key-gamma' },
  ];

  const simulatedNodes: SimulatedNodeConfig[] = [];

  for (const cfg of configs) {
    const keyHash = crypto.createHash('sha256').update(cfg.key).digest('hex');
    let node = await PhysicalAsset.findOne({ name: cfg.name });
    if (!node) {
      node = new PhysicalAsset({
        entityId: entity._id,
        facilityId: facility._id,
        name: cfg.name,
        type: 'IOT_NODE',
        status: 'ACTIVE',
        assetCode: `SIM-${cfg.scenario.toUpperCase().slice(0, 4)}`,
        serialNumber: `SN-SIM-${cfg.scenario.toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
        macAddress: `00:1A:2B:3C:4D:${Math.floor(Math.random() * 90 + 10)}`,
        deviceKey: cfg.key,
        deviceKeyHash: keyHash,
      });
      await node.save();
    } else {
      node.deviceKey = cfg.key;
      node.deviceKeyHash = keyHash;
      await node.save();
    }

    const state =
      cfg.scenario === 'healthy'
        ? { tempC: 58.5, moisturePct: 52.0, ph: 6.85, methanePpm: 120, airPressureHpa: 1012.4, batteryMv: 3950, signalRssi: -65 }
        : cfg.scenario === 'acid_crash'
        ? { tempC: 37.5, moisturePct: 66.0, ph: 4.85, methanePpm: 290, airPressureHpa: 1013.2, batteryMv: 3820, signalRssi: -72 }
        : { tempC: 49.0, moisturePct: 56.0, ph: 6.2, methanePpm: 380, airPressureHpa: 1016.5, batteryMv: 3910, signalRssi: -68 };

    simulatedNodes.push({
      nodeId: node._id.toString(),
      deviceKey: cfg.key,
      name: node.name,
      scenario: cfg.scenario,
      state,
    });
  }

  return simulatedNodes;
}

async function simulateNodeBurst(node: SimulatedNodeConfig, baseUrl = 'http://127.0.0.1:3001') {
  // Evolve virtual physics based on scenario
  if (node.scenario === 'healthy') {
    node.state.tempC = Math.round((58 + (Math.random() - 0.5) * 1.5) * 10) / 10;
    node.state.moisturePct = Math.round((52 + (Math.random() - 0.5) * 2.0) * 10) / 10;
    node.state.ph = Math.round((6.85 + (Math.random() - 0.5) * 0.1) * 100) / 100;
    node.state.methanePpm = Math.round(110 + Math.random() * 30);
  } else if (node.scenario === 'acid_crash') {
    node.state.tempC = Math.round((37.5 + (Math.random() - 0.5) * 0.8) * 10) / 10;
    node.state.ph = Math.round((4.80 + (Math.random() - 0.5) * 0.08) * 100) / 100;
    node.state.moisturePct = Math.round((65 + Math.random() * 3) * 10) / 10;
  } else if (node.scenario === 'odor_risk') {
    node.state.methanePpm += Math.round(15 + Math.random() * 10);
    node.state.airPressureHpa = 1016.5; // Constant high compaction pressure
  }

  const timestamp = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = {
    nodeId: node.nodeId,
    timestamp,
    tempC: node.state.tempC,
    moisturePct: node.state.moisturePct,
    ph: node.state.ph,
    methanePpm: node.state.methanePpm,
    airPressureHpa: node.state.airPressureHpa,
    batteryMv: node.state.batteryMv,
    signalRssi: node.state.signalRssi,
  };

  const payloadString = JSON.stringify(payload);

  // Compute canonical HMAC-SHA256 signature
  const canonicalData = `${node.nodeId}:${timestamp}:${nonce}:${payloadString}`;
  const signature = crypto
    .createHmac('sha256', node.deviceKey)
    .update(canonicalData)
    .digest('hex');

  const startMs = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Node-Id': node.nodeId,
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Signature': signature,
        'X-Device-Key': node.deviceKey,
      },
      body: payloadString,
    });

    const durationMs = Date.now() - startMs;
    const body: any = await res.json();

    return {
      node: node.name,
      status: res.status,
      durationMs,
      packetId: body.packetId || 'sync',
      telemetry: `${node.state.tempC}°C | ${node.state.moisturePct}% | pH ${node.state.ph} | ${node.state.methanePpm} PPM`,
    };
  } catch (err: any) {
    return {
      node: node.name,
      status: 'ERR',
      durationMs: Date.now() - startMs,
      error: err.message,
    };
  }
}

export async function runFleetSimulation(batches = 3, intervalMs = 1000) {
  console.log(`\n======================================================`);
  console.log(`🚀 PRITHVI-GRID FLEET TELEMETRY SIMULATOR`);
  console.log(`Provisioning virtual Smart Spear nodes in database...`);
  const nodes = await ensureSimulatorNodes();
  console.log(`Simulating ${nodes.length} Smart Spear Nodes over ${batches} burst cycles...`);
  console.log(`======================================================\n`);

  for (let b = 1; b <= batches; b++) {
    console.log(`--- Burst Batch ${b}/${batches} [${new Date().toLocaleTimeString()}] ---`);
    for (const node of nodes) {
      const result = await simulateNodeBurst(node);
      console.log(
        `[Node: ${result.node}] HTTP ${result.status} | Latency: ${result.durationMs}ms | Data: ${result.telemetry || result.error}`
      );
    }
    if (b < batches) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  console.log(`\n✅ Fleet simulation finished. Check Live Telemetry Lake & Socket.IO feed.\n`);
  process.exit(0);
}

runFleetSimulation(3, 1000).catch((err) => {
  console.error(err);
  process.exit(1);
});
