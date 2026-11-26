import React from 'react';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { WifiOff, CloudSync, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineQueue();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full px-4 py-2 text-xs font-bold transition-all flex items-center justify-between border-b shadow-sm ${
        !isOnline
          ? 'bg-amber-500 text-amber-950 border-amber-600'
          : 'bg-emerald-600 text-white border-emerald-700'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 animate-pulse flex-shrink-0" />
            <span>
              <strong>ऑफ़लाइन मोड (Offline):</strong> आपका डेटा डिवाइस में सुरक्षित है।
            </span>
          </>
        ) : (
          <>
            <CloudSync className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>ऑनलाइन:</strong> {pendingCount} स्थानीय रिकॉर्ड कतार में हैं।
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {pendingCount > 0 && (
          <span className="bg-black/20 px-2 py-0.5 rounded-full font-mono text-[11px]">
            {pendingCount} पेंडिंग
          </span>
        )}

        {isOnline && pendingCount > 0 && (
          <button
            type="button"
            onClick={syncNow}
            disabled={isSyncing}
            className="px-2.5 py-1 bg-white text-emerald-800 rounded-lg text-[11px] font-black hover:bg-emerald-50 active:scale-95 flex items-center gap-1 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'सिंक हो रहा है...' : 'सिंक करें'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
