import React, { useState, useEffect } from 'react';
import { EntryTypeToggle } from './EntryTypeToggle';
import { VisualCalculator } from './VisualCalculator';
import { BackDatePicker } from './BackDatePicker';
import { useUiStore } from '../../store/ui.store';
import { diaryApi } from '../../api/diary.api';
import { offlineSyncService } from '../../services/offline-sync.service';
import { RotateCcw, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RecentEntry {
  _id: string;
  flowType: 'WASTE_IN' | 'FERTILIZER_OUT' | 'REJECT_OUT' | 'LEACHATE_OUT';
  weightKg: number;
  recordedAt: string;
  createdAt: string;
  pitFillKgAfter?: number;
}

export const DiaryCard: React.FC = () => {
  const { selectedBoxId } = useUiStore();
  const [flowType, setFlowType] = useState<'WASTE_IN' | 'FERTILIZER_OUT'>('WASTE_IN');
  const [weightStr, setWeightStr] = useState<string>('0');
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'offline' } | null>(null);

  // Undo state
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number>(0);
  const [isUndoing, setIsUndoing] = useState<boolean>(false);

  // Recent entries for box
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [boxFillData, setBoxFillData] = useState<{ currentFillKg: number; capacityKg: number; fillPercentage: number } | null>(null);

  const loadRecentEntries = async () => {
    if (!selectedBoxId) return;
    try {
      const res = await diaryApi.getBoxMonitor(selectedBoxId);
      if (res.data) {
        setRecentEntries(res.data.recentEntries || []);
        setBoxFillData({
          currentFillKg: res.data.currentFillKg,
          capacityKg: res.data.capacityKg,
          fillPercentage: res.data.fillPercentage,
        });
      }
    } catch {
      // Ignore if offline
    }
  };

  useEffect(() => {
    loadRecentEntries();
  }, [selectedBoxId]);

  // Countdown timer for 5-minute undo window
  useEffect(() => {
    if (undoSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setUndoSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [undoSecondsLeft]);

  const handleUndo = async (entryIdToUndo?: string) => {
    const targetId = entryIdToUndo || lastCreatedId;
    if (!targetId) return;

    try {
      setIsUndoing(true);
      await diaryApi.undoEntry(targetId);
      setMessage({
        text: '✅ प्रविष्टि वापस ले ली गई (Entry successfully undone)',
        type: 'success',
      });
      setLastCreatedId(null);
      setUndoSecondsLeft(0);
      loadRecentEntries();
    } catch (err: any) {
      setMessage({
        text: err?.response?.data?.message || 'वापस लेने में त्रुटि हुई (Failed to undo entry)',
        type: 'error',
      });
    } finally {
      setIsUndoing(false);
    }
  };

  const handleSubmit = async () => {
    const weightNum = parseFloat(weightStr);
    if (!weightNum || weightNum <= 0) {
      setMessage({ text: 'कृपया सही वजन दर्ज करें (Weight must be > 0)', type: 'error' });
      return;
    }

    if (weightNum > 5000) {
      setMessage({ text: 'एक बार में 5000 किलो से अधिक दर्ज नहीं किया जा सकता (Max 5,000 kg)', type: 'error' });
      return;
    }

    if (!selectedBoxId) {
      setMessage({ text: 'कृपया पहले गड्ढा (Box) चुनें', type: 'error' });
      return;
    }

    // Graceful offline check
    if (!navigator.onLine) {
      await offlineSyncService.enqueue('DIARY_ENTRY', {
        boxId: selectedBoxId,
        flowType,
        weightKg: weightNum,
        recordedAt: entryDate.toISOString(),
      });
      setMessage({
        text: `📦 ऑफ़लाइन दर्ज हुआ: ${flowType === 'WASTE_IN' ? 'कचरा' : 'खाद'} ${weightNum} kg। नेटवर्क आने पर सिंक होगा।`,
        type: 'offline',
      });
      setWeightStr('0');
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      const res: any = await diaryApi.createEntry({
        boxId: selectedBoxId,
        flowType,
        weightKg: weightNum,
        recordedAt: entryDate.toISOString(),
      });

      const entryId = res?.data?.id || res?.data?._id;
      if (entryId) {
        setLastCreatedId(entryId);
        setUndoSecondsLeft(300); // 5 minutes = 300 seconds
      }

      setMessage({
        text: `✅ ${flowType === 'WASTE_IN' ? 'कचरा' : 'खाद'} ${weightNum} किलो सफलतापूर्वक दर्ज हुआ!`,
        type: 'success',
      });
      setWeightStr('0');
      loadRecentEntries();
    } catch (err: any) {
      // If network dropped mid-request, save to offline IndexedDB
      if (!navigator.onLine || err?.message?.includes('Network Error')) {
        await offlineSyncService.enqueue('DIARY_ENTRY', {
          boxId: selectedBoxId,
          flowType,
          weightKg: weightNum,
          recordedAt: entryDate.toISOString(),
        });
        setMessage({
          text: `📦 नेटवर्क त्रुटि - ऑफ़लाइन सहेजा गया (${weightNum} kg)। नेटवर्क आने पर सिंक होगा।`,
          type: 'offline',
        });
        setWeightStr('0');
      } else {
        setMessage({
          text: err?.response?.data?.message || 'दर्ज करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
          type: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEntryUndoable = (createdAtStr: string) => {
    const elapsed = Date.now() - new Date(createdAtStr).getTime();
    return elapsed <= 5 * 60 * 1000;
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          कचरा आमदनी और खाद निकासी खाता
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          (Digital Khad-Kachra Ledger & SWM Audit Proof)
        </p>
      </div>

      {/* Box Fill Status Summary if available */}
      {boxFillData && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">गड्ढे में वर्तमान मात्रा:</span>
            <span className="font-mono font-black text-slate-900 dark:text-white text-base">
              {boxFillData.currentFillKg} / {boxFillData.capacityKg} kg
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400 block font-medium">भराव (Capacity):</span>
            <span
              className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg ${
                boxFillData.fillPercentage >= 90
                  ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {boxFillData.fillPercentage}%
            </span>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <EntryTypeToggle value={flowType} onChange={setFlowType} />

      {/* Back Date / Timing Picker */}
      <BackDatePicker value={entryDate} onChange={setEntryDate} />

      {/* Visual Calculator with Indian Presets */}
      <VisualCalculator
        value={weightStr}
        onChange={setWeightStr}
        flowType={flowType}
      />

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl font-bold text-center text-sm shadow-sm flex flex-col items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
              : message.type === 'offline'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800'
              : 'bg-red-100 text-red-900 border border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>

          {/* 5-Minute Undo Button (Workstream E5) */}
          {lastCreatedId && undoSecondsLeft > 0 && (
            <button
              type="button"
              disabled={isUndoing}
              onClick={() => handleUndo()}
              className="mt-1 py-1.5 px-4 bg-white/90 hover:bg-white text-slate-800 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-slate-300"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
              <span>
                {isUndoing
                  ? 'वापस लिया जा रहा है...'
                  : `गलती से दर्ज हुआ? वापस लें (${Math.floor(undoSecondsLeft / 60)}:${(undoSecondsLeft % 60).toString().padStart(2, '0')})`}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Massive Save Button */}
      <button
        type="button"
        disabled={isSubmitting || parseFloat(weightStr) <= 0 || parseFloat(weightStr) > 5000}
        onClick={handleSubmit}
        className={`w-full py-5 rounded-2xl font-black text-2xl shadow-xl transition-all tactile-btn flex items-center justify-center gap-3 ${
          parseFloat(weightStr) > 0 && parseFloat(weightStr) <= 5000
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98 shadow-emerald-500/25'
            : 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
        }`}
      >
        <span>{isSubmitting ? 'दर्ज हो रहा है...' : '💾 खाता में दर्ज करें'}</span>
      </button>

      {/* Recent Entries & Undo List */}
      {recentEntries.length > 0 && (
        <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>हालिया प्रविष्टियां (Recent Logs)</span>
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">5 मिनट पूर्ववत सुविधा</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentEntries.slice(0, 5).map((entry) => {
              const undoable = isEntryUndoable(entry.createdAt);
              return (
                <div key={entry._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span
                      className={`inline-block font-black px-2 py-0.5 rounded-md text-[10px] mr-2 ${
                        entry.flowType === 'WASTE_IN'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {entry.flowType === 'WASTE_IN' ? 'कचरा आया' : 'खाद निकली'}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {entry.weightKg} kg
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] ml-2">
                      {new Date(entry.recordedAt || entry.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {undoable && (
                    <button
                      type="button"
                      disabled={isUndoing}
                      onClick={() => handleUndo(entry._id)}
                      className="py-1 px-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Undo</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
