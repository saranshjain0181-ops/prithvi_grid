#!/usr/bin/env tsx
/**
 * Prithvi Grid — Factory Provisioning CLI Tool (Workstream D1)
 *
 * Usage:
 *   npx tsx src/tools/provision-device.ts --mac 00:1B:44:11:3A:C7 --facility <FACILITY_ID> --entity <ENTITY_ID>
 */

import { connectMongoDB } from '../db/mongoose';
import { factoryProvisionDevice } from '../services/provisioning.service';
import fs from 'fs';
import path from 'path';

async function runCli() {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const mac = getArg('mac') || '00:1B:44:11:3A:' + Math.floor(Math.random() * 89 + 10).toString(16).toUpperCase();
  const facilityId = getArg('facility') || '671600000000000000000001';
  const entityId = getArg('entity') || '671500000000000000000001';
  const name = getArg('name') || `Smart Spear Probe ${mac.slice(-5)}`;
  const hwRev = getArg('hw-rev') || 'REV_B_ESP32_A7670C';
  const outDir = getArg('out') || './provisioning-output';

  console.log('🌱 Prithvi Grid — Hardware Node Factory Provisioning Engine');
  console.log(`📡 Target MAC: ${mac} | HW Revision: ${hwRev}`);

  await connectMongoDB();

  const result = await factoryProvisionDevice({
    entityId,
    facilityId,
    macAddress: mac,
    name,
    hardwareRevision: hwRev,
  });

  console.log('\n============================================================');
  console.log('✅ FACTORY PROVISIONING SUCCESSFUL');
  console.log('============================================================');
  console.log(`Node ID:         ${result.asset._id}`);
  console.log(`Asset Code:      ${result.asset.assetCode}`);
  console.log(`Serial Number:   ${result.asset.serialNumber}`);
  console.log(`Lifecycle State: ${result.asset.status}`);
  console.log(`Device Key:      ${result.rawDeviceKey} (SAVE SECURELY!)`);
  console.log(`Key SHA-256:     ${result.deviceKeyHash}`);
  console.log('============================================================\n');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const jsonPath = path.join(outDir, `${result.asset.assetCode}_nvs.json`);
  const headerPath = path.join(outDir, `${result.asset.assetCode}_config.h`);

  fs.writeFileSync(jsonPath, JSON.stringify(result.nvsConfig, null, 2));
  fs.writeFileSync(headerPath, result.nvsHeaderC);

  console.log(`💾 NVS Config saved: ${jsonPath}`);
  console.log(`💾 C-Header saved:   ${headerPath}`);
  console.log('\nReady for factory flashing via esptool.py or NVS partition flashing.\n');

  process.exit(0);
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error('Provisioning failed:', err);
    process.exit(1);
  });
}
