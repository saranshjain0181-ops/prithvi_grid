import React, { useState } from 'react';

export interface LabourWorker {
  _id: string;
  name: string;
  phone: string;
  assignedBoxes: string[];
  assignedNodes: string[];
  shiftStart: string;
  shiftEnd: string;
  activeDays: string[];
  isActive: boolean;
}

interface RosterEditorProps {
  workers?: LabourWorker[];
  availableBoxes?: { id: string; name: string }[];
  onSave?: (workerId: string, updatedData: Partial<LabourWorker>) => Promise<void>;
}

const ALL_DAYS = [
  { key: 'MON', label: 'सोम (Mon)' },
  { key: 'TUE', label: 'मंगल (Tue)' },
  { key: 'WED', label: 'बुध (Wed)' },
  { key: 'THU', label: 'गुरु (Thu)' },
  { key: 'FRI', label: 'शुक्र (Fri)' },
  { key: 'SAT', label: 'शनि (Sat)' },
  { key: 'SUN', label: 'रवि (Sun)' },
];

export const RosterEditor: React.FC<RosterEditorProps> = ({
  workers = [],
  availableBoxes = [],
  onSave,
}) => {
  const [editingWorker, setEditingWorker] = useState<LabourWorker | null>(null);
  const [shiftStart, setShiftStart] = useState('08:00');
  const [shiftEnd, setShiftEnd] = useState('16:00');
  const [activeDays, setActiveDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
  const [selectedBoxes, setSelectedBoxes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (worker: LabourWorker) => {
    setEditingWorker(worker);
    setShiftStart(worker.shiftStart || '08:00');
    setShiftEnd(worker.shiftEnd || '16:00');
    setActiveDays(worker.activeDays || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
    setSelectedBoxes(worker.assignedBoxes || []);
  };

  const toggleDay = (dayKey: string) => {
    setActiveDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  const toggleBox = (boxId: string) => {
    setSelectedBoxes((prev) =>
      prev.includes(boxId) ? prev.filter((b) => b !== boxId) : [...prev, boxId]
    );
  };

  const handleSave = async () => {
    if (!editingWorker || !onSave) return;
    try {
      setIsSaving(true);
      await onSave(editingWorker._id, {
        shiftStart,
        shiftEnd,
        activeDays,
        assignedBoxes: selectedBoxes,
      });
      setEditingWorker(null);
    } catch (err) {
      alert('Failed to save roster');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
      <div>
        <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
          सफाई मित्र ड्यूटी रोस्टर इंजन (Dynamic Duty Rostering Engine)
        </h2>
        <p className="text-xs font-semibold text-slate-500">
          Assign specific compost pits, shift hours, and weekly work schedules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((worker) => (
          <div
            key={worker._id}
            className="p-5 rounded-2xl border border-gray-100 bg-[#FDFBF7] shadow-sm flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-slate-900">{worker.name}</h4>
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">{worker.phone}</p>

              <div className="mt-3 text-xs space-y-1.5 text-slate-600 font-medium">
                <div>
                  <strong>शिफ्ट समय:</strong> {worker.shiftStart} - {worker.shiftEnd}
                </div>
                <div>
                  <strong>कार्य दिवस:</strong> {worker.activeDays?.join(', ') || 'Mon-Sat'}
                </div>
                <div>
                  <strong>निर्धारित गड्ढे:</strong> {worker.assignedBoxes?.length || 0} गड्ढे
                </div>
              </div>
            </div>

            <button
              onClick={() => startEdit(worker)}
              className="w-full py-2 bg-white hover:bg-gray-50 border border-gray-200 text-slate-800 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              ड्यूटी असाइन करें (Edit Duty)
            </button>
          </div>
        ))}
      </div>

      {/* Edit Duty Modal */}
      {editingWorker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                ड्यूटी असाइनमेंट: {editingWorker.name}
              </h3>
              <p className="text-xs text-slate-500">{editingWorker.phone}</p>
            </div>

            {/* Shift Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  शिफ्ट शुरू (Start Time):
                </label>
                <input
                  type="time"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-mono text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  शिफ्ट समाप्ति (End Time):
                </label>
                <input
                  type="time"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-mono text-sm font-bold"
                />
              </div>
            </div>

            {/* Weekly Days */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                सप्ताह के कार्य दिवस (Working Days):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDay(d.key)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      activeDays.includes(d.key)
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Box Assignment */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                असाइन किए गए गड्ढे (Assigned Compost Boxes):
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
                {availableBoxes.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBox(b.id)}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left border transition-all ${
                      selectedBoxes.includes(b.id)
                        ? 'bg-green-50 border-green-500 text-green-900'
                        : 'bg-gray-50 border-gray-200 text-slate-700'
                    }`}
                  >
                    {selectedBoxes.includes(b.id) ? '✓ ' : '+ '}
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={isSaving}
                onClick={handleSave}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-black shadow-md"
              >
                {isSaving ? 'सेव हो रहा है...' : 'ड्यूटी सुरक्षित करें (Save Duty)'}
              </button>
              <button
                onClick={() => setEditingWorker(null)}
                className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-sm font-bold"
              >
                रद्द करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
