import React, { useState } from 'react';

export interface AssetRecord {
  _id: string;
  name: string;
  type: 'COMPOST_BOX' | 'IOT_NODE';
  capacityKg?: number;
  macAddress?: string;
  imei?: string;
  simNumber?: string;
  qrCodeUrl?: string;
  status: 'ACTIVE' | 'DECOMMISSIONED';
}

interface AssetCMSProps {
  assets?: AssetRecord[];
  onAddBox?: (name: string, capacityKg: number) => Promise<void>;
}

export const AssetCMS: React.FC<AssetCMSProps> = ({
  assets = [],
  onAddBox,
}) => {
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);
  const [boxName, setBoxName] = useState('');
  const [boxCapacity, setBoxCapacity] = useState('1000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const boxes = assets.filter((a) => a.type === 'COMPOST_BOX');
  const nodes = assets.filter((a) => a.type === 'IOT_NODE');

  const handleCreateBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxName || !onAddBox) return;
    try {
      setIsSubmitting(true);
      await onAddBox(boxName, parseFloat(boxCapacity) || 1000);
      setBoxName('');
      setShowAddBoxModal(false);
    } catch (err) {
      alert('Error creating box');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
            भौतिक संपत्ति और नोड प्रबंधन (Compost Box & IoT Node CMS)
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            Add, configure, and inspect QR codes for physical pits and telemetry sensors.
          </p>
        </div>

        <button
          onClick={() => setShowAddBoxModal(true)}
          className="py-2.5 px-4 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
        >
          <span>➕ नया गड्ढा जोड़ें (Add Box)</span>
        </button>
      </div>

      {/* Boxes Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          कंपोस्ट गड्ढे (Compost Boxes): {boxes.length}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {boxes.map((box) => (
            <div
              key={box._id}
              className="p-4 rounded-2xl border border-gray-200 bg-[#FDFBF7] flex items-start justify-between shadow-sm"
            >
              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-slate-900">{box.name}</h4>
                <p className="text-xs font-semibold text-slate-500">
                  क्षमता: {box.capacityKg || 1000} किलो
                </p>
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                    Active Box
                  </span>
                </div>
              </div>

              {box.qrCodeUrl && (
                <div className="text-center">
                  <img
                    src={box.qrCodeUrl}
                    alt="Box QR"
                    className="w-16 h-16 rounded-lg border bg-white p-1"
                  />
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">QR Code</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Nodes List */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          सेंसर नोड्स (Hardware IoT Nodes): {nodes.length}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nodes.map((node) => (
            <div
              key={node._id}
              className="p-4 rounded-2xl border border-gray-200 bg-white flex items-center justify-between shadow-sm"
            >
              <div className="space-y-0.5">
                <div className="font-extrabold text-sm text-slate-900">{node.name}</div>
                <div className="text-xs text-slate-500 font-mono">
                  MAC: {node.macAddress || '—'}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  IMEI: {node.imei || '—'} | SIM: {node.simNumber || '—'}
                </div>
              </div>
              {node.qrCodeUrl && (
                <img
                  src={node.qrCodeUrl}
                  alt="Node QR"
                  className="w-12 h-12 rounded-lg border p-1"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Box Modal */}
      {showAddBoxModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBox}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-black text-slate-900">नया कंपोस्ट गड्ढा जोड़ें</h3>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                गड्ढे का नाम (Box Name):
              </label>
              <input
                type="text"
                required
                value={boxName}
                onChange={(e) => setBoxName(e.target.value)}
                placeholder="उदा. गड्ढा संख्या 3"
                className="w-full p-2.5 border rounded-xl font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                अधिकतम क्षमता किलो में (Capacity Kg):
              </label>
              <input
                type="number"
                required
                value={boxCapacity}
                onChange={(e) => setBoxCapacity(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-bold text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-black shadow-md"
              >
                {isSubmitting ? 'जोड़ा जा रहा है...' : 'सुरक्षित करें (Save Box)'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddBoxModal(false)}
                className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-sm font-bold"
              >
                रद्द करें
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
