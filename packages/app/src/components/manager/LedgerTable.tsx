import React, { useState } from 'react';
import { format } from 'date-fns';
import { actionsApi } from '../../api/actions.api';

export interface LedgerItem {
  _id: string;
  labourName: string;
  labourPhone: string;
  actionLabelHi: string;
  actionType: string;
  boxName: string;
  nodeName: string;
  executedAt: string;
  verificationStatus: 'PENDING' | 'VERIFIED_GENUINE' | 'FAKE_FLAG' | 'MANAGER_OVERRIDE';
  sensorDelta?: {
    temp: number;
    moisture: number;
    pressure: number;
  };
  managerRemark?: string;
}

interface LedgerTableProps {
  items?: LedgerItem[];
  onRefresh?: () => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ items = [], onRefresh }) => {
  const [selectedItem, setSelectedItem] = useState<LedgerItem | null>(null);
  const [remarkText, setRemarkText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAction = async (status: 'VERIFIED_GENUINE' | 'FAKE_FLAG' | 'MANAGER_OVERRIDE') => {
    if (!selectedItem) return;
    try {
      setIsUpdating(true);
      await actionsApi.overrideLedger({
        ledgerId: selectedItem._id,
        status,
        managerRemark: remarkText || undefined,
      });
      setSelectedItem(null);
      setRemarkText('');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error updating status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: LedgerItem['verificationStatus']) => {
    switch (status) {
      case 'VERIFIED_GENUINE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-green-100 text-green-800 border border-green-200">
            <span>✔️</span>
            <span>असली प्रमाणित (Genuine)</span>
          </span>
        );
      case 'FAKE_FLAG':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-200">
            <span>⚠️</span>
            <span>सेंसर अंतर शून्य (Fake Flag)</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
            <span>⏳</span>
            <span>15-मिनट जांच जारी (Pending)</span>
          </span>
        );
      case 'MANAGER_OVERRIDE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
            <span>🛡️</span>
            <span>मैनेजर प्रमाणित (Override)</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
      <div>
        <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
          मजदूरों का 30 दिनों का हाजिरी और काम खाता (Kaam Ka Saboot Audit Ledger)
        </h2>
        <p className="text-xs font-semibold text-slate-500">
          Real-time physical sensor verification with 15-minute thermodynamic variance validation.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-gray-50/50">
              <th className="py-3 px-4">सफाई मित्र (Labour)</th>
              <th className="py-3 px-4">काम (Action Taken)</th>
              <th className="py-3 px-4">स्थान (Pit / Node)</th>
              <th className="py-3 px-4">समय (Time)</th>
              <th className="py-3 px-4">सबूत स्थिति (Status)</th>
              <th className="py-3 px-4">सेंसर अंतर (Delta)</th>
              <th className="py-3 px-4 text-right">कार्रवाई (Action)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm font-medium text-slate-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400 font-semibold">
                  हाल ही में कोई काम दर्ज नहीं हुआ है (No recent records)
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#0F172A]">{row.labourName}</div>
                    <div className="text-xs text-slate-400">{row.labourPhone}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{row.actionLabelHi}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                    {row.boxName} • {row.nodeName}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    {format(new Date(row.executedAt), 'dd MMM, hh:mm a')}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(row.verificationStatus)}</td>
                  <td className="py-3 px-4 text-xs font-mono text-slate-600">
                    {row.sensorDelta
                      ? `ΔT: ${row.sensorDelta.temp}°C | ΔM: ${row.sensorDelta.moisture}%`
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedItem(row);
                        setRemarkText(row.managerRemark || '');
                      }}
                      className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      समीक्षा / बदलें
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Review & Override Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">
              काम का सबूत समीक्षा (Audit Action Claim)
            </h3>
            <div className="text-sm text-slate-600 bg-gray-50 p-3 rounded-xl space-y-1">
              <div>
                <strong>कर्मचारी:</strong> {selectedItem.labourName} ({selectedItem.labourPhone})
              </div>
              <div>
                <strong>काम:</strong> {selectedItem.actionLabelHi}
              </div>
              <div>
                <strong>वर्तमान स्थिति:</strong> {selectedItem.verificationStatus}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                मैनेजर टिप्पणी (Manager Remarks):
              </label>
              <textarea
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="कारण या जांच का विवरण दर्ज करें..."
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                disabled={isUpdating}
                onClick={() => handleAction('VERIFIED_GENUINE')}
                className="py-2.5 px-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black"
              >
                स्वीकारें (Approve)
              </button>
              <button
                disabled={isUpdating}
                onClick={() => handleAction('FAKE_FLAG')}
                className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black"
              >
                अस्वीकारें (Reject)
              </button>
              <button
                disabled={isUpdating}
                onClick={() => handleAction('MANAGER_OVERRIDE')}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black"
              >
                विशेष अनुमति (Override)
              </button>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-xs font-bold mt-2"
            >
              रद्द करें (Cancel)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
