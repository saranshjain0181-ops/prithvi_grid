import React, { useState, useEffect } from 'react';
import {
  fleetApi,
  FleetNodeItem,
  NodeHealthAssessment,
  OtaReleaseItem,
  DeviceLifecycleStatus,
  OtaRolloutStatus,
} from '../api/fleet.api';

export const FleetManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'FLEET' | 'OTA'>('FLEET');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [nodes, setNodes] = useState<FleetNodeItem[]>([]);
  const [otaReleases, setOtaReleases] = useState<OtaReleaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Health modal state
  const [selectedHealth, setSelectedHealth] = useState<NodeHealthAssessment | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  // Status change modal state
  const [statusChangeNode, setStatusChangeNode] = useState<FleetNodeItem | null>(null);
  const [newStatus, setNewStatus] = useState<DeviceLifecycleStatus>('MAINTENANCE');
  const [statusReason, setStatusReason] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Provisioning modal state
  const [showProvisionModal, setShowProvisionModal] = useState<boolean>(false);
  const [provisionMac, setProvisionMac] = useState<string>('');
  const [provisionName, setProvisionName] = useState<string>('');
  const [provisionResult, setProvisionResult] = useState<any | null>(null);
  const [provisioning, setProvisioning] = useState<boolean>(false);

  // New OTA release modal state
  const [showOtaModal, setShowOtaModal] = useState<boolean>(false);
  const [otaVersion, setOtaVersion] = useState<string>('v2.1.0-prod');
  const [otaBinaryUrl, setOtaBinaryUrl] = useState<string>('https://firmware.prithvigrid.com/esp32/v2.1.0.bin');
  const [otaSha256, setOtaSha256] = useState<string>('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [otaFileSizeBytes, setOtaFileSizeBytes] = useState<number>(1450000);
  const [otaNotes, setOtaNotes] = useState<string>('Firmware upgrade for low-power sleep timing and supercapacitor preservation');
  const [submittingOta, setSubmittingOta] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [nodesRes, otaRes] = await Promise.all([
        fleetApi.listNodes(statusFilter === 'ALL' ? undefined : statusFilter),
        fleetApi.listOtaReleases(),
      ]);
      setNodes(nodesRes.data || []);
      setOtaReleases(otaRes.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed loading fleet telemetry data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleInspectHealth = async (nodeId: string) => {
    try {
      setHealthLoading(true);
      const res = await fleetApi.getNodeHealth(nodeId);
      setSelectedHealth(res.data);
    } catch (err: any) {
      alert('Failed loading node health assessment: ' + (err?.message || 'Unknown error'));
    } finally {
      setHealthLoading(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeNode) return;
    try {
      setUpdatingStatus(true);
      await fleetApi.updateNodeStatus(statusChangeNode.id, newStatus, statusReason);
      setStatusChangeNode(null);
      setStatusReason('');
      await loadData();
    } catch (err: any) {
      alert('Status update failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProvisioning(true);
      const facilityId = nodes[0]?.facilityId || '671600000000000000000001';
      const res = await fleetApi.provisionNode({
        facilityId,
        macAddress: provisionMac,
        name: provisionName || `Smart Spear ${provisionMac.slice(-5)}`,
        hardwareRevision: 'REV_B_ESP32_A7670C',
      });
      setProvisionResult(res.data);
      await loadData();
    } catch (err: any) {
      alert('Provisioning failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setProvisioning(false);
    }
  };

  const handleOtaCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingOta(true);
      await fleetApi.createOtaRelease({
        version: otaVersion,
        hardwareRevision: 'REV_B_ESP32_A7670C',
        binaryUrl: otaBinaryUrl,
        sha256: otaSha256,
        fileSizeBytes: otaFileSizeBytes,
        minSupercapVoltageMv: 4800,
        minRssiDbm: -85,
        releaseNotes: otaNotes,
      });
      setShowOtaModal(false);
      await loadData();
    } catch (err: any) {
      alert('Firmware release creation failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSubmittingOta(false);
    }
  };

  const handleUpdateRollout = async (id: string, status: OtaRolloutStatus, pct?: number) => {
    try {
      await fleetApi.updateRollout(id, status, pct);
      await loadData();
    } catch (err: any) {
      alert('Rollout update failed: ' + (err?.response?.data?.message || err.message));
    }
  };

  const handleAbortRollout = async (id: string) => {
    if (!window.confirm('EMERGENCY ABORT: Are you sure you want to rollback this canary firmware immediately?')) return;
    try {
      await fleetApi.abortRollout(id);
      await loadData();
    } catch (err: any) {
      alert('Rollout abort failed: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Fleet Counts
  const counts = {
    total: nodes.length,
    active: nodes.filter((n) => n.status === 'ACTIVE').length,
    degraded: nodes.filter((n) => n.status === 'DEGRADED').length,
    offline: nodes.filter((n) => n.status === 'OFFLINE').length,
    provisioned: nodes.filter((n) => n.status === 'PROVISIONED').length,
    maintenance: nodes.filter((n) => n.status === 'MAINTENANCE').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Hardware Fleet & Supercapacitor Telemetry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Battery-less Smart Spear telemetry, LTC3108 harvester efficiency, predictive maintenance & OTA staging.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setProvisionResult(null);
              setProvisionMac('00:1B:44:11:3A:' + Math.floor(Math.random() * 89 + 10).toString(16).toUpperCase());
              setShowProvisionModal(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            + Factory Provision Node
          </button>
          <button
            onClick={() => setShowOtaModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            + Stage Firmware OTA
          </button>
        </div>
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Nodes</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{counts.total}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Active Live</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{counts.active}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-semibold text-amber-500">Degraded Health</div>
          <div className="text-2xl font-black text-amber-500 mt-1">{counts.degraded}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-semibold text-rose-500">Offline / Asleep</div>
          <div className="text-2xl font-black text-rose-500 mt-1">{counts.offline}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-semibold text-blue-500">Provisioned</div>
          <div className="text-2xl font-black text-blue-500 mt-1">{counts.provisioned}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-semibold text-purple-500">Maintenance</div>
          <div className="text-2xl font-black text-purple-500 mt-1">{counts.maintenance}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 flex gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('FLEET')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'FLEET'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          📡 Fleet Hardware & Supercapacitor Health ({nodes.length})
        </button>
        <button
          onClick={() => setActiveTab('OTA')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'OTA'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          🚀 Firmware Releases & Canary Rollouts ({otaReleases.length})
        </button>
      </div>

      {/* TAB 1: FLEET INVENTORY */}
      {activeTab === 'FLEET' && (
        <div className="space-y-4">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'ACTIVE', 'DEGRADED', 'OFFLINE', 'PROVISIONED', 'MAINTENANCE'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading live hardware nodes...</div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 rounded-xl text-sm">
              {error}
            </div>
          ) : nodes.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No nodes matching filter <span className="font-bold">"{statusFilter}"</span>.
              </p>
              <button
                onClick={() => {
                  setProvisionResult(null);
                  setProvisionMac('00:1B:44:11:3A:C8');
                  setShowProvisionModal(true);
                }}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
              >
                Provision First Node
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nodes.map((node) => {
                const supercap = node.supercapacitor || {
                  voltageMv: 5000,
                  vDropBurstMv: 150,
                  tegDeltaTC: 20,
                  harvestEfficiencyPct: 85,
                  estimatedEsrMilliOhms: 75,
                  healthScorePct: 90,
                  brownoutRisk: 'LOW',
                };

                const vPct = Math.min(100, Math.round(((supercap.voltageMv - 3000) / (5400 - 3000)) * 100));

                let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
                if (node.status === 'ACTIVE') badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                if (node.status === 'DEGRADED') badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                if (node.status === 'OFFLINE') badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                if (node.status === 'PROVISIONED') badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
                if (node.status === 'MAINTENANCE') badgeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';

                return (
                  <div
                    key={node.id}
                    className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-400">{node.assetCode}</div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white">{node.name}</h4>
                        <div className="text-xs text-slate-500 mt-0.5">{node.facilityName}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                        {node.status}
                      </span>
                    </div>

                    {/* Supercapacitor & Harvester Meters */}
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                        <span>Supercapacitor:</span>
                        <span className="font-mono font-bold">{(supercap.voltageMv / 1000).toFixed(2)}V / 5.4V</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            supercap.voltageMv >= 4500
                              ? 'bg-emerald-500'
                              : supercap.voltageMv >= 3800
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${vPct}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500">
                        <div>
                          Burst Drop: <span className="font-bold text-slate-700 dark:text-slate-200">{supercap.vDropBurstMv}mV</span>
                        </div>
                        <div>
                          Harvester ΔT: <span className="font-bold text-slate-700 dark:text-slate-200">+{supercap.tegDeltaTC}°C</span>
                        </div>
                        <div>
                          ESR: <span className="font-bold text-slate-700 dark:text-slate-200">{supercap.estimatedEsrMilliOhms} mΩ</span>
                        </div>
                        <div>
                          Health Score: <span className="font-bold text-slate-700 dark:text-slate-200">{supercap.healthScorePct}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div>Firmware: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{node.firmwareVersion}</span></div>
                      <div>Signal: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{node.signalRssi} dBm</span></div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleInspectHealth(node.id)}
                        className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition"
                      >
                        Inspect Health
                      </button>
                      <button
                        onClick={() => {
                          setStatusChangeNode(node);
                          setNewStatus(node.status);
                        }}
                        className="py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition"
                      >
                        Change State
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OTA FIRMWARE STAGING & CANARY */}
      {activeTab === 'OTA' && (
        <div className="space-y-4">
          {otaReleases.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm">No firmware releases registered.</p>
              <button
                onClick={() => setShowOtaModal(true)}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                Create Release
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {otaReleases.map((rel) => {
                let statusBadge = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
                if (rel.rolloutStatus === 'GENERAL_AVAILABILITY') statusBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                if (rel.rolloutStatus === 'CANARY') statusBadge = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
                if (rel.rolloutStatus === 'ROLLED_BACK') statusBadge = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';

                return (
                  <div
                    key={rel._id}
                    className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-slate-900 dark:text-white font-mono">{rel.version}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${statusBadge}`}>
                            {rel.rolloutStatus}
                          </span>
                          {rel.isCircuitBreakerTripped && (
                            <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase">
                              ⚠️ Circuit Breaker Tripped
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          HW: <span className="font-bold">{rel.hardwareRevision}</span> | Size: {(rel.fileSizeBytes / 1024 / 1024).toFixed(2)} MB | Min Supercap: {rel.minSupercapVoltageMv}mV
                        </div>
                      </div>

                      {/* Rollout Control Actions */}
                      <div className="flex items-center gap-2">
                        {rel.rolloutStatus === 'DRAFT' && (
                          <button
                            onClick={() => handleUpdateRollout(rel._id, 'CANARY', 10)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                          >
                            Start 10% Canary
                          </button>
                        )}
                        {rel.rolloutStatus === 'CANARY' && (
                          <>
                            <button
                              onClick={() => handleUpdateRollout(rel._id, 'CANARY', 50)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                            >
                              Expand to 50%
                            </button>
                            <button
                              onClick={() => handleUpdateRollout(rel._id, 'GENERAL_AVAILABILITY', 100)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                            >
                              Promote to 100% GA
                            </button>
                            <button
                              onClick={() => handleAbortRollout(rel._id)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
                            >
                              Abort Canary
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Canary Progress Bar & Metrics */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Canary Deployment: {rel.canaryPercentage}% Fleet Targeted
                        </span>
                        <span className="text-slate-500">
                          Failure Rate: <span className={`font-mono font-bold ${rel.metrics.failureRatePct > 2 ? 'text-rose-500' : 'text-emerald-500'}`}>{rel.metrics.failureRatePct}%</span> (Limit: 2.0%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full transition-all"
                          style={{ width: `${rel.canaryPercentage}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-2 text-xs text-slate-500">
                        <div>Staged: <span className="font-bold text-slate-800 dark:text-slate-200">{rel.metrics.stagedCount}</span></div>
                        <div>Downloaded: <span className="font-bold text-slate-800 dark:text-slate-200">{rel.metrics.downloadedCount}</span></div>
                        <div>Success Boots: <span className="font-bold text-emerald-600 dark:text-emerald-400">{rel.metrics.successCount}</span></div>
                        <div>Reverted/Failures: <span className="font-bold text-rose-600">{rel.metrics.failedRollbackCount}</span></div>
                      </div>
                    </div>

                    {rel.circuitBreakerReason && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
                        ⚠️ {rel.circuitBreakerReason}
                      </div>
                    )}

                    <div className="text-xs text-slate-500">
                      Release Notes: {rel.releaseNotes}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* HEALTH INSPECTION MODAL */}
      {selectedHealth && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-slate-400">{selectedHealth.assetCode}</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedHealth.name}</h3>
                <div className="text-xs text-slate-500">Status: {selectedHealth.status} | HW: {selectedHealth.hardwareRevision}</div>
              </div>
              <button
                onClick={() => setSelectedHealth(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Health Score Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="text-[11px] text-slate-500">Health Score</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{selectedHealth.assessment.healthScorePct}%</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="text-[11px] text-slate-500">Supercap V</div>
                <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{(selectedHealth.assessment.voltageMv / 1000).toFixed(2)}V</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="text-[11px] text-slate-500">ESR Resistance</div>
                <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{selectedHealth.assessment.estimatedEsrMilliOhms} mΩ</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="text-[11px] text-slate-500">Brownout Risk</div>
                <div className="text-2xl font-black mt-1 text-slate-800 dark:text-white">{selectedHealth.assessment.brownoutRisk}</div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Predictive Maintenance Analysis</h5>
              <div className="space-y-1.5">
                {selectedHealth.assessment.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-lg">
                    {rec}
                  </div>
                ))}
              </div>
            </div>

            {/* Lifecycle History Audit Log */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Lifecycle State Audit Log</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedHealth.lifecycleHistory.map((item, idx) => (
                  <div key={idx} className="text-xs p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg flex justify-between">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{item.fromStatus} ➔ {item.toStatus}</span>
                      <p className="text-slate-500 mt-0.5">{item.reason}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(item.changedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedHealth(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE STATE MODAL */}
      {statusChangeNode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleStatusSubmit}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4"
          >
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Transition Node State</h3>
            <p className="text-xs text-slate-500">
              Update lifecycle status for <span className="font-bold text-slate-700 dark:text-slate-300">{statusChangeNode.name}</span>.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">New Lifecycle Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as DeviceLifecycleStatus)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold"
              >
                <option value="ACTIVE">ACTIVE (Normal Telemetry)</option>
                <option value="MAINTENANCE">MAINTENANCE (Technician Servicing)</option>
                <option value="DECOMMISSIONED">DECOMMISSIONED (Retired / Defective)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Reason for State Transition</label>
              <textarea
                required
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Dispatched technician for supercapacitor replacement and thermal heatsink re-pasting"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusChangeNode(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingStatus}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
              >
                {updatingStatus ? 'Updating...' : 'Confirm Transition'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PROVISIONING MODAL */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Factory Node Provisioning</h3>
                <p className="text-xs text-slate-500">Register and flash a new battery-less Smart Spear probe.</p>
              </div>
              <button onClick={() => setShowProvisionModal(false)} className="text-slate-400">✕</button>
            </div>

            {!provisionResult ? (
              <form onSubmit={handleProvisionSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">MAC Address (ESP32-WROOM-32E)</label>
                  <input
                    required
                    value={provisionMac}
                    onChange={(e) => setProvisionMac(e.target.value)}
                    placeholder="00:1B:44:11:3A:C7"
                    className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Custom Probe Name</label>
                  <input
                    value={provisionName}
                    onChange={(e) => setProvisionName(e.target.value)}
                    placeholder="Apollo Hospital Pit 2 Spear"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-xs font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provisioning}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                  >
                    {provisioning ? 'Generating Keys...' : 'Generate Factory Keys'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg font-bold">
                  ✅ Device Provisioned in PROVISIONED State
                </div>
                <div className="text-xs space-y-1.5 font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                  <div>Asset: <span className="font-bold">{provisionResult.assetCode}</span></div>
                  <div>Serial: <span className="font-bold">{provisionResult.serialNumber}</span></div>
                  <div className="break-all">Key: <span className="font-bold text-rose-600">{provisionResult.rawDeviceKey}</span></div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowProvisionModal(false)}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW FIRMWARE RELEASE MODAL */}
      {showOtaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleOtaCreate}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Stage OTA Firmware Release</h3>
                <p className="text-xs text-slate-500">Upload and configure canary staging parameters.</p>
              </div>
              <button type="button" onClick={() => setShowOtaModal(false)} className="text-slate-400">✕</button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Semantic Version</label>
              <input
                required
                value={otaVersion}
                onChange={(e) => setOtaVersion(e.target.value)}
                placeholder="v2.1.0-prod"
                className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Binary URL (.bin)</label>
              <input
                required
                value={otaBinaryUrl}
                onChange={(e) => setOtaBinaryUrl(e.target.value)}
                placeholder="https://firmware.prithvigrid.com/esp32/v2.1.0.bin"
                className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">SHA-256 Binary Checksum</label>
              <input
                required
                value={otaSha256}
                onChange={(e) => setOtaSha256(e.target.value)}
                placeholder="64-character hex"
                className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Release Notes</label>
              <textarea
                rows={2}
                value={otaNotes}
                onChange={(e) => setOtaNotes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOtaModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingOta}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
              >
                {submittingOta ? 'Creating...' : 'Register Artifact'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FleetManagement;
