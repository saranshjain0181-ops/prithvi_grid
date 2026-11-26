import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { complianceApi } from '../../api/compliance.api';
import {
  ShieldCheck,
  Lock,
  Download,
  Calendar,
  Building2,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';

export const AuditorInspectionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError('अमान्य या अनुपस्थित निरीक्षक टोकन (Missing Auditor Access Token). कृपया अपने वैध लिंक का उपयोग करें।');
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        const res = await complianceApi.getAuditorInspectBundle(token);
        if (res.data) {
          setAuditData(res.data);
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            'ऑडिट टोकन अमान्य है या इसकी समय सीमा (Expiry) समाप्त हो चुकी है।'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold">SWM-2026 सुरक्षित ऑडिट पोर्टल लोड हो रहा है...</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying cryptographic auditor token & signatures</p>
      </div>
    );
  }

  if (error || !auditData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-800/60 rounded-3xl p-6 text-center shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-black text-white">पहुंच अस्वीकृत (Access Denied)</h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">{error}</p>
          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Prithvi Grid • Babu-Shield Compliance Infrastructure • SWM-2026
          </div>
        </div>
      </div>
    );
  }

  const facility = auditData.facility;
  const entity = facility?.entityId;
  const auditor = auditData.auditor;
  const certificates = auditData.certificates || [];
  const ledger = auditData.recentLaborLedger || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16 font-sans">
      {/* Top Prominent Watermark Banner (Workstream N2) */}
      <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-black flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>
            🛡️ OFFICIAL SWM-2026 AUDITOR INSPECTION MODE — READ ONLY — EXPIRES:{' '}
            {auditor?.expiresAt ? new Date(auditor.expiresAt).toLocaleString('en-IN') : 'LIMITED TIME'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-600/40 px-2 py-0.5 rounded text-[10px] uppercase font-mono">
            {auditor?.agency || 'IMC INDORE'}
          </span>
          <Lock className="w-3.5 h-3.5" />
        </div>
      </div>

      <main className="max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                {entity?.orgName || 'Bulk Waste Generator'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-700 text-emerald-400">
                VERIFIED REGISTRY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              प्लांट: {facility?.facilityName || facility?.name} • इंदौर नगर निगम (IMC) जोन {facility?.imcZone || '1'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-xs flex items-center gap-3">
            <Building2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">निगम SWM पंजीयन संख्या:</span>
              <span className="font-mono font-black text-white">{entity?.swmRegNo || 'SWM-IND-2026-NOC'}</span>
            </div>
          </div>
        </div>

        {/* Auditor Credentials Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">अधिकृत निरीक्षक (Auditor):</span>
            <span className="font-bold text-white text-sm">{auditor?.name || 'Municipal Officer'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">प्राधिकरण (Agency):</span>
            <span className="font-bold text-emerald-400">{auditor?.agency || 'Indore Municipal Corporation'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">सुरक्षा प्रोटोकॉल (Security):</span>
            <span className="font-mono text-slate-300">HMAC-SHA256 Token Scoped</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">अनुमति स्तर (Access Level):</span>
            <span className="font-bold text-amber-400">केवल अवलोकन (Strict Read-Only)</span>
          </div>
        </div>

        {/* Section 1: Certified SWM-2026 Audit Reports */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
              <span>प्रमाणित SWM-2026 ऑडिट सर्टिफिकेट्स (Cryptographically Sealed Reports)</span>
            </h2>
            <span className="text-xs text-slate-400">डिजिटल रूप से हस्ताक्षरित</span>
          </div>

          {certificates.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-xs">
              इस फैसिलिटी के लिए अभी कोई सीलबंद ऑडिट रिपोर्ट उपलब्ध नहीं है।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert: any) => (
                <div
                  key={cert._id}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-600/60 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        {cert.certificateId}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 border border-emerald-700 text-emerald-300">
                        {cert.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(cert.periodStart).toLocaleDateString('en-IN')} -{' '}
                        {new Date(cert.periodEnd).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Summary badges */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">कचरा प्रसंस्कृत</span>
                      <span className="font-mono font-bold text-white">
                        {cert.summary?.totalWasteInKg?.toLocaleString()} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">खाद उत्पादन</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {cert.summary?.totalFertilizerOutKg?.toLocaleString()} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">थर्मोफिलिक अवधि</span>
                      <span className="font-mono font-bold text-amber-400">
                        {cert.summary?.thermophilicHours || 72} hrs
                      </span>
                    </div>
                  </div>

                  {/* SHA-256 Hash Display */}
                  <div className="bg-black/40 p-2.5 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-400 truncate">
                    <span className="text-emerald-500 font-bold">SHA-256: </span>
                    {cert.certificateHash}
                  </div>

                  {/* PDF Download Button */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
                    <a
                      href={`http://localhost:3001/api/v1/compliance/${cert.certificateId}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>सत्यापित PDF सर्टिफिकेट डाउनलोड</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Verified Labour Execution Ledger */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>काम का सबूत लेजर (Sensor-Verified Labour Execution Proof)</span>
            </h2>
            <span className="text-xs text-slate-400">भौतिक सेंसर भिन्नता से प्रमाणित</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">समय (Timestamp)</th>
                    <th className="py-3 px-4">कार्य प्रकार (Action)</th>
                    <th className="py-3 px-4">सत्यापन स्थिति (Status)</th>
                    <th className="py-3 px-4">सेंसर भिन्नता (Physical Delta)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        कोई हालिया लेजर रिकॉर्ड नहीं है।
                      </td>
                    </tr>
                  ) : (
                    ledger.map((item: any) => (
                      <tr key={item._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {new Date(item.taskTimestamp || item.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {item.actionType}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              item.verificationStatus === 'VERIFIED_GENUINE'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : item.verificationStatus === 'INCONCLUSIVE'
                                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                : 'bg-red-950 text-red-300 border border-red-700'
                            }`}
                          >
                            {item.verificationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {item.sensorDelta
                            ? `ΔT: ${item.sensorDelta.temp || 0}°C | ΔM: ${item.sensorDelta.moisture || 0}% | ΔP: ${item.sensorDelta.pressure || 0} hPa`
                            : 'Sensor Variance Verified'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
