import React, { useState, useEffect } from 'react';
import {
  configApi,
  ThresholdValues,
  SimulationResult,
  ThresholdHistoryItem,
} from '../../api/config.api';

export const ThresholdConfigurator: React.FC = () => {
  const [thresholds, setThresholds] = useState<ThresholdValues>({
    tempMin: 55,
    tempMax: 65,
    moistureMin: 40,
    moistureMax: 60,
    phAcidCrash: 5.2,
    methaneAlert: 300,
    methaneCritical: 450,
    pressureCompactionAlert: 1015,
    verificationWaitMinutes: 15,
    nodeOfflineMinutes: 240,
  });

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<ThresholdHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deployNotes, setDeployNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await configApi.getThresholds();
      if (res.data?.activeThresholds) {
        setThresholds(res.data.activeThresholds);
      }
      if (res.data?.history) {
        setHistory(res.data.history);
      }
    } catch (err: any) {
      console.warn('Could not fetch remote thresholds, using local defaults', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (key: keyof ThresholdValues, val: number) => {
    setThresholds((prev) => ({ ...prev, [key]: val }));
    setSimulation(null); // Invalidate previous simulation on edit
  };

  const handleRunBacktest = async () => {
    try {
      setSimulating(true);
      setStatusMessage(null);
      const res = await configApi.backtestThresholds(thresholds);
      setSimulation(res.data.simulation);
    } catch (err: any) {
      alert('Backtest simulation failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSimulating(false);
    }
  };

  const handleDeploy = async () => {
    try {
      setDeploying(true);
      const res = await configApi.deployThresholds({
        thresholds,
        simulation: simulation || undefined,
        notes: deployNotes || 'Manual threshold deployment from Supreme Command Center',
      });
      setStatusMessage(res.message);
      setDeployNotes('');
      await loadData();
    } catch (err: any) {
      alert('Deployment failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-2xl max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Master Rule & AI Threshold Configurator (Shadow Backtesting)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Simulate proposed biological trigger adjustments against historical compost telemetry before deploying to the fleet.
          </p>
        </div>

        {statusMessage && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
            ✓ {statusMessage}
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading fleet thresholds...</div>
      ) : (
        <div className="space-y-6">
          {/* Threshold Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Thermophilic Range */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                🌡️ Thermophilic Temp (°C)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Min Temp (°C)</label>
                  <input
                    type="number"
                    value={thresholds.tempMin}
                    onChange={(e) => handleChange('tempMin', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Max Temp (°C)</label>
                  <input
                    type="number"
                    value={thresholds.tempMax}
                    onChange={(e) => handleChange('tempMax', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Moisture Range */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                💧 Moisture Range (%)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Min Moisture (%)</label>
                  <input
                    type="number"
                    value={thresholds.moistureMin}
                    onChange={(e) => handleChange('moistureMin', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Max Moisture (%)</label>
                  <input
                    type="number"
                    value={thresholds.moistureMax}
                    onChange={(e) => handleChange('moistureMax', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Acidity & Methane */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <h4 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400">
                ⚠️ Acid & Anaerobic Risk
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">pH Acid Crash</label>
                  <input
                    type="number"
                    step="0.1"
                    value={thresholds.phAcidCrash}
                    onChange={(e) => handleChange('phAcidCrash', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Methane Alert (PPM)</label>
                  <input
                    type="number"
                    value={thresholds.methaneAlert}
                    onChange={(e) => handleChange('methaneAlert', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SIMULATION & BACKTEST PREVIEW */}
          <div className="p-5 bg-indigo-50/50 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300">
                  🔬 Shadow Backtest & Impact Simulation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Run a retroactive simulation against past telemetry to calculate alert volume shifts and compliance rate impacts.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunBacktest}
                disabled={simulating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition shadow"
              >
                {simulating ? 'Running Simulation...' : '▶ Run Shadow Backtest'}
              </button>
            </div>

            {simulation && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500">Evaluated Points</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {simulation.evaluatedSampleCount} samples
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500">Alert Volume Delta</div>
                    <div className={`text-lg font-black mt-0.5 ${simulation.alertDeltaPct > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {simulation.alertDeltaPct > 0 ? `+${simulation.alertDeltaPct}%` : `${simulation.alertDeltaPct}%`}
                    </div>
                    <div className="text-[10px] text-slate-400">{simulation.baselineAlerts} ➔ {simulation.simulatedAlerts} alerts</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500">Compliance Pass Rate</div>
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {simulation.compliancePassRateSimulatedPct}%
                    </div>
                    <div className="text-[10px] text-slate-400">Baseline: {simulation.compliancePassRateBaselinePct}%</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500">Compost Pits Affected</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {simulation.affectedPitsCount} pits
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 pt-2">
                  <input
                    type="text"
                    value={deployNotes}
                    onChange={(e) => setDeployNotes(e.target.value)}
                    placeholder="Enter deployment change remark (e.g. Winter season threshold relaxation)"
                    className="flex-1 p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleDeploy}
                    disabled={deploying}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-black rounded-xl transition shadow"
                  >
                    {deploying ? 'Deploying...' : '🚀 Deploy Confirmed Thresholds to Fleet'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DEPLOYMENT HISTORY TABLE */}
          {history.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                📜 Threshold Version & Deployment Audit History
              </h4>
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item._id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 dark:text-white">v{item.version}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded text-[10px]">
                          {item.status}
                        </span>
                        <span className="text-slate-400 text-[11px]">{item.deployedAt ? new Date(item.deployedAt).toLocaleString() : ''}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">{item.notes}</p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                      <span>Temp: {item.thresholds.tempMin}-{item.thresholds.tempMax}°C</span>
                      <span>pH: {item.thresholds.phAcidCrash}</span>
                      <span>Methane: {item.thresholds.methaneAlert}PPM</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThresholdConfigurator;
