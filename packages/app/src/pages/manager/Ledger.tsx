import React from 'react';
import { LedgerTable, LedgerItem } from '../../components/manager/LedgerTable';
import { AppTopBar } from '../../components/layout/AppTopBar';
import { ManagerSubNav } from '../../components/layout/ManagerSubNav';
import { UniversalAiAssistant } from '../../components/ai/UniversalAiAssistant';

export const ManagerLedger: React.FC = () => {
  const mockLedgerItems: LedgerItem[] = [
    {
      _id: 'led-1',
      labourName: 'रामू भाई (Ramu)',
      labourPhone: '9826012345',
      actionLabelHi: 'कचरा घुमाया और पानी डाला',
      actionType: 'KACHRA_GHUMAYA',
      boxName: 'गड्ढा 1',
      nodeName: 'नोड Alpha',
      executedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      verificationStatus: 'VERIFIED_GENUINE',
      sensorDelta: { temp: 2.4, moisture: 4.8, pressure: 0.8 },
      managerRemark: 'सेंसर में तापमान और नमी में वृद्धि दर्ज हुई।',
    },
    {
      _id: 'led-2',
      labourName: 'सोनू कुमार (Sonu)',
      labourPhone: '9826054321',
      actionLabelHi: 'नीम पाउडर डाला',
      actionType: 'NEEM_POWDER_DALA',
      boxName: 'गड्ढा 2',
      nodeName: 'नोड Beta',
      executedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      verificationStatus: 'PENDING',
    },
    {
      _id: 'led-3',
      labourName: 'दिनेश जी (Dinesh)',
      labourPhone: '9826099999',
      actionLabelHi: 'पानी छिड़काव किया',
      actionType: 'PAANI_CHHIDKA',
      boxName: 'गड्ढा 1',
      nodeName: 'नोड Alpha',
      executedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      verificationStatus: 'FAKE_FLAG',
      sensorDelta: { temp: 0.1, moisture: 0.2, pressure: 0.0 },
      managerRemark: '15 मिनट के बाद नमी में कोई अंतर नहीं दिखा।',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <AppTopBar roleMode="BWG_MANAGER" />
      <ManagerSubNav />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            काम का सबूत (Kaam Ka Saboot) • भौतिक सत्यापन खाता
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            मजदूरों द्वारा किए गए कार्यों का 15-मिनट हार्डवेयर सेंसर विचरण सत्यापन
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <LedgerTable items={mockLedgerItems} />
        </div>
      </div>

      <UniversalAiAssistant userRole="BWG_MANAGER" />
    </div>
  );
};
