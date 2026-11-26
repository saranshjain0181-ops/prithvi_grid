import React from 'react';
import { SanjivaniAlerts, SanjivaniAlertItem } from '../../components/manager/SanjivaniAlerts';
import { AppTopBar } from '../../components/layout/AppTopBar';
import { ManagerSubNav } from '../../components/layout/ManagerSubNav';
import { UniversalAiAssistant } from '../../components/ai/UniversalAiAssistant';

export const ManagerAlerts: React.FC = () => {
  const mockAlerts: SanjivaniAlertItem[] = [
    {
      _id: 'alt-1',
      alertType: 'ACID_CRASH',
      severity: 'CRITICAL',
      triggerValues: { ph: 4.8, tempC: 38.5, moisturePct: 68 },
      recipeCard: {
        titleHi: 'संजीवनी आपातकालीन कंपोस्ट पुनर्जीवन नुस्खा (Acid Crash Detected)',
        titleEn: 'AI Sanjivani Emergency Compost Revival Recipe',
        instructionsHi: [
          '15 किलो सूखी पत्तियां या लकड़ी का भूसा (ब्राउन कार्बन) डालें।',
          '3 किलो गुड़ को 10 लीटर गुनगुने पानी में घोलकर छिड़कें (माइक्रोबियल बूस्टर)।',
          'कंपोस्ट को ऊपर से नीचे 15 मिनट तक अच्छी तरह पलटें और हवा दें।',
          'अगले 48 घंटे तक कोई नया गीला कचरा न डालें।',
        ],
        instructionsEn: [
          'Add 15 kg dry leaves or sawdust (carbon source).',
          'Dissolve 3 kg jaggery in 10L warm water and spray evenly.',
          'Turn and aerate compost thoroughly for 15 minutes.',
          'Halt new wet waste feeding for 48 hours.',
        ],
        immediateAction: 'SOOKHE_PATTE_DALA, GUD_PAANI_DALA, KACHRA_GHUMAYA',
      },
      createdAt: new Date().toISOString(),
      acknowledged: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <AppTopBar roleMode="BWG_MANAGER" />
      <ManagerSubNav />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            सक्रिय जैविक संजीवनी अलर्ट (AI Sanjivani & Biological Alerts)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            एसिड क्रैश, मीथेन स्पाइक और अवायवीय सड़न से बचाव के लिए AI रेसिपी कार्ड
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <SanjivaniAlerts
            alerts={mockAlerts}
            onAcknowledge={async (id) => {
              alert(`अलर्ट ${id} स्वीकार किया गया।`);
            }}
          />
        </div>
      </div>

      <UniversalAiAssistant userRole="BWG_MANAGER" />
    </div>
  );
};
