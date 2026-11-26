import mongoose from 'mongoose';
import { env } from '../config/env';
import { GlobalEntity } from '../db/models/GlobalEntity';
import { FacilityLocation } from '../db/models/FacilityLocation';
import { UserAuthRoster } from '../db/models/UserAuthRoster';
import { PhysicalAsset } from '../db/models/PhysicalAsset';

export async function bootstrapMasterAdmin() {
  console.log('👑 [Bootstrap] Connecting to MongoDB for Master Admin provisioning...');
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI);
  }

  // 1. Ensure Root Global Entity exists
  let rootEntity = await GlobalEntity.findOne({ slug: 'prithvi-supreme-central' });
  if (!rootEntity) {
    rootEntity = await GlobalEntity.create({
      name: 'Prithvi Grid Supreme Command',
      slug: 'prithvi-supreme-central',
      type: 'CORPORATION',
      state: 'Madhya Pradesh',
      district: 'Indore',
      city: 'Indore',
      contactName: 'Super Admin',
      contactPhone: '1234567890',
      contactEmail: 'supreme@prithvigrid.com',
      licenseKey: 'PRITHVI-SUPREME-MASTER-KEY-2026',
      licenseExpiresAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000), // 10 years
      isActive: true,
      settings: {
        maxFacilities: 1000,
        maxNodes: 10000,
        whatsappAlerts: true,
        complianceReportingEnabled: true,
      },
    });
    console.log('✅ [Bootstrap] Created root GlobalEntity:', rootEntity.name);
  }

  // 2. Ensure Default Facility exists
  let defaultFacility = await FacilityLocation.findOne({ entityId: rootEntity._id });
  if (!defaultFacility) {
    defaultFacility = await FacilityLocation.create({
      entityId: rootEntity._id,
      name: 'Indore Central NOC Facility',
      code: 'IND-NOC-01',
      address: 'Palasia Square, Indore, Madhya Pradesh',
      ward: 'Ward 12',
      coordinates: {
        lat: 22.7196,
        lng: 75.8577,
      },
      totalBoxes: 4,
      totalNodes: 4,
      facilityType: 'CENTRALIZED',
      operationalStatus: 'ACTIVE',
      managerIds: [],
      totalCapacityKg: 5000,
      currentFillKg: 1200,
    });
    console.log('✅ [Bootstrap] Created default FacilityLocation:', defaultFacility.name);
  }

  // 3. Ensure Default Compost Box & IoT Node exist
  let defaultBox = await PhysicalAsset.findOne({ facilityId: defaultFacility._id, type: 'COMPOST_BOX' });
  if (!defaultBox) {
    defaultBox = await PhysicalAsset.create({
      entityId: rootEntity._id,
      facilityId: defaultFacility._id,
      type: 'COMPOST_BOX',
      name: 'Central Gaddha Alpha',
      assetCode: 'BOX-IND-001',
      serialNumber: 'SN-BOX-2026-001',
      capacityKg: 1500,
      status: 'ACTIVE',
    });
    console.log('✅ [Bootstrap] Created default Compost Box:', defaultBox.name);
  }

  let defaultNode = await PhysicalAsset.findOne({ facilityId: defaultFacility._id, type: 'IOT_NODE' });
  if (!defaultNode) {
    defaultNode = await PhysicalAsset.create({
      entityId: rootEntity._id,
      facilityId: defaultFacility._id,
      parentBoxId: defaultBox._id,
      type: 'IOT_NODE',
      name: 'Central Sensor Node A1',
      assetCode: 'NODE-ESP32-001',
      serialNumber: 'SN-NODE-2026-001',
      macAddress: '00:1B:44:11:3A:B7',
      imei: '868324050123456',
      simNumber: '9893001234',
      status: 'ACTIVE',
      lastSeenAt: new Date(),
    });
    console.log('✅ [Bootstrap] Created default IoT Node:', defaultNode.name);
  }

  // 4. Provision Supreme Head (Master Admin) with Phone: 1234567890
  const masterPhone = '1234567890';
  let masterAdmin = await UserAuthRoster.findOne({ phone: masterPhone });

  if (masterAdmin) {
    masterAdmin.role = 'SUPREME_HEAD';
    masterAdmin.isActive = true;
    masterAdmin.entityId = rootEntity._id as any;
    masterAdmin.facilityId = defaultFacility._id as any;
    masterAdmin.assignedBoxes = [defaultBox._id as any];
    masterAdmin.assignedNodes = [defaultNode._id as any];
    masterAdmin.shiftStart = '00:00';
    masterAdmin.shiftEnd = '23:59';
    masterAdmin.activeDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    await masterAdmin.save();
    console.log(`✅ [Bootstrap] Updated existing Master Admin (${masterPhone}) with full SUPREME_HEAD privileges.`);
  } else {
    masterAdmin = await UserAuthRoster.create({
      entityId: rootEntity._id,
      facilityId: defaultFacility._id,
      name: 'Supreme Head Admin',
      phone: masterPhone,
      role: 'SUPREME_HEAD',
      isActive: true,
      assignedBoxes: [defaultBox._id],
      assignedNodes: [defaultNode._id],
      shiftStart: '00:00',
      shiftEnd: '23:59',
      activeDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      accessLogs: [
        {
          at: new Date(),
          ip: '127.0.0.1',
          action: 'MASTER_ADMIN_BOOTSTRAP_PROVISIONED',
        },
      ],
    });
    console.log(`👑 [Bootstrap] Successfully provisioned Master Admin: ${masterAdmin.name} (${masterAdmin.phone})`);
  }

  // 5. Provision Dedicated BWG Manager with Phone: 9876543210
  const managerPhone = '9876543210';
  let bwgManager = await UserAuthRoster.findOne({ phone: managerPhone });
  if (bwgManager) {
    bwgManager.role = 'BWG_MANAGER';
    bwgManager.isActive = true;
    bwgManager.entityId = rootEntity._id as any;
    bwgManager.facilityId = defaultFacility._id as any;
    bwgManager.assignedBoxes = [defaultBox._id as any];
    bwgManager.assignedNodes = [defaultNode._id as any];
    bwgManager.shiftStart = '08:00';
    bwgManager.shiftEnd = '18:00';
    bwgManager.activeDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    await bwgManager.save();
    console.log(`✅ [Bootstrap] Updated existing BWG Manager (${managerPhone})`);
  } else {
    bwgManager = await UserAuthRoster.create({
      entityId: rootEntity._id,
      facilityId: defaultFacility._id,
      name: 'Rajesh Sharma (BWG Manager)',
      phone: managerPhone,
      role: 'BWG_MANAGER',
      isActive: true,
      assignedBoxes: [defaultBox._id],
      assignedNodes: [defaultNode._id],
      shiftStart: '08:00',
      shiftEnd: '18:00',
      activeDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      accessLogs: [
        {
          at: new Date(),
          ip: '127.0.0.1',
          action: 'BWG_MANAGER_BOOTSTRAP_PROVISIONED',
        },
      ],
    });
    console.log(`🏢 [Bootstrap] Successfully provisioned BWG Manager: ${bwgManager.name} (${bwgManager.phone})`);
  }

  // Link manager to facility
  if (!defaultFacility.managerIds.some((m: any) => m.toString() === bwgManager!._id.toString())) {
    defaultFacility.managerIds.push(bwgManager!._id as any);
    await defaultFacility.save();
  }

  // 6. Provision Dedicated Safai Mitra (Labour) with Phone: 9123456780
  const labourPhone = '9123456780';
  let safaiMitra = await UserAuthRoster.findOne({ phone: labourPhone });
  if (safaiMitra) {
    safaiMitra.role = 'SAFAI_MITRA';
    safaiMitra.isActive = true;
    safaiMitra.entityId = rootEntity._id as any;
    safaiMitra.facilityId = defaultFacility._id as any;
    safaiMitra.assignedBoxes = [defaultBox._id as any];
    safaiMitra.assignedNodes = [defaultNode._id as any];
    safaiMitra.shiftStart = '06:00';
    safaiMitra.shiftEnd = '14:00';
    safaiMitra.activeDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    await safaiMitra.save();
    console.log(`✅ [Bootstrap] Updated existing Safai Mitra (${labourPhone})`);
  } else {
    safaiMitra = await UserAuthRoster.create({
      entityId: rootEntity._id,
      facilityId: defaultFacility._id,
      name: 'Ram Singh (Safai Mitra)',
      phone: labourPhone,
      role: 'SAFAI_MITRA',
      isActive: true,
      assignedBoxes: [defaultBox._id],
      assignedNodes: [defaultNode._id],
      shiftStart: '06:00',
      shiftEnd: '14:00',
      activeDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      accessLogs: [
        {
          at: new Date(),
          ip: '127.0.0.1',
          action: 'SAFAI_MITRA_BOOTSTRAP_PROVISIONED',
        },
      ],
    });
    console.log(`👷 [Bootstrap] Successfully provisioned Safai Mitra: ${safaiMitra.name} (${safaiMitra.phone})`);
  }

  return {
    success: true,
    supreme: { phone: masterPhone, role: 'SUPREME_HEAD', devOtp: '1234' },
    manager: { phone: managerPhone, role: 'BWG_MANAGER', devOtp: '1234' },
    labour: { phone: labourPhone, role: 'SAFAI_MITRA', devOtp: '1234' },
  };
}

// Execute standalone if called directly
if (require.main === module || process.argv[1]?.includes('init_master_admin')) {
  bootstrapMasterAdmin()
    .then((res) => {
      console.log('\n🚀 [Bootstrap Complete] Eligible Accounts:');
      console.log(`   👑 Supreme Head: ${res.supreme.phone} (OTP: ${res.supreme.devOtp}) -> hq.prithvigrid.com`);
      console.log(`   🏢 BWG Manager:  ${res.manager.phone} (OTP: ${res.manager.devOtp}) -> app.prithvigrid.com`);
      console.log(`   👷 Safai Mitra:  ${res.labour.phone} (OTP: ${res.labour.devOtp}) -> app.prithvigrid.com\n`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ [Bootstrap Error]:', err);
      process.exit(1);
    });
}
