import React from 'react';
import { AssetCMS, AssetRecord } from '../../components/manager/AssetCMS';
import { AppTopBar } from '../../components/layout/AppTopBar';
import { ManagerSubNav } from '../../components/layout/ManagerSubNav';
import { UniversalAiAssistant } from '../../components/ai/UniversalAiAssistant';

export const ManagerAssets: React.FC = () => {
  const mockAssets: AssetRecord[] = [
    {
      _id: 'box-1',
      name: 'गड्ढा संख्या 1 (Pit Alpha)',
      type: 'COMPOST_BOX',
      capacityKg: 1000,
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PRITHVI-BOX-1',
      status: 'ACTIVE',
    },
    {
      _id: 'box-2',
      name: 'गड्ढा संख्या 2 (Pit Beta)',
      type: 'COMPOST_BOX',
      capacityKg: 1500,
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PRITHVI-BOX-2',
      status: 'ACTIVE',
    },
    {
      _id: 'node-1',
      name: 'सेंसर नोड 1 (Node Alpha)',
      type: 'IOT_NODE',
      macAddress: '00:1B:44:11:3A:B7',
      imei: '868324050123456',
      simNumber: '9893001234',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PRITHVI-NODE-1',
      status: 'ACTIVE',
    },
    {
      _id: 'node-2',
      name: 'सेंसर नोड 2 (Node Beta)',
      type: 'IOT_NODE',
      macAddress: '00:1B:44:11:3A:C2',
      imei: '868324050123999',
      simNumber: '9893005678',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PRITHVI-NODE-2',
      status: 'ACTIVE',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <AppTopBar roleMode="BWG_MANAGER" />
      <ManagerSubNav />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            प्लांट भौतिक परिसंपत्तियां (Compost Pits & IoT Hardware Nodes)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            गड्ढों और 4G ESP32 हार्डवेयर नोड्स का प्रबंधन एवं QR कोड जनरेटर
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <AssetCMS assets={mockAssets} />
        </div>
      </div>

      <UniversalAiAssistant userRole="BWG_MANAGER" />
    </div>
  );
};
