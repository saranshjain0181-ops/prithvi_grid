import React from 'react';
import { RosterEditor } from '../../components/manager/RosterEditor';
import { AppTopBar } from '../../components/layout/AppTopBar';
import { ManagerSubNav } from '../../components/layout/ManagerSubNav';
import { UniversalAiAssistant } from '../../components/ai/UniversalAiAssistant';

export const ManagerRoster: React.FC = () => {
  const mockWorkers = [
    {
      _id: 'w-1',
      name: 'रामू भाई (Ramu)',
      phone: '9826012345',
      assignedBoxes: ['box-1', 'box-2'],
      assignedNodes: ['node-1'],
      shiftStart: '08:00',
      shiftEnd: '16:00',
      activeDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      isActive: true,
    },
    {
      _id: 'w-2',
      name: 'सोनू कुमार (Sonu)',
      phone: '9826054321',
      assignedBoxes: ['box-2'],
      assignedNodes: ['node-2'],
      shiftStart: '09:00',
      shiftEnd: '17:00',
      activeDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      isActive: true,
    },
  ];

  const mockBoxes = [
    { id: 'box-1', name: 'गड्ढा 1 (Pit 1)' },
    { id: 'box-2', name: 'गड्ढा 2 (Pit 2)' },
    { id: 'box-3', name: 'गड्ढा 3 (Pit 3)' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <AppTopBar roleMode="BWG_MANAGER" />
      <ManagerSubNav />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            सफाई मित्र ड्यूटी रोस्टर एवं कार्यभार प्रबंधन
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            गड्ढों और नोड्स पर कर्मचारियों का समय निर्धारण एवं शिफ्ट असाइनमेंट
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <RosterEditor
            workers={mockWorkers}
            availableBoxes={mockBoxes}
            onSave={async (id, data) => {
              console.log('Saved roster:', id, data);
              alert('ड्यूटी रोस्टर सुरक्षित हुआ!');
            }}
          />
        </div>
      </div>

      <UniversalAiAssistant userRole="BWG_MANAGER" />
    </div>
  );
};
