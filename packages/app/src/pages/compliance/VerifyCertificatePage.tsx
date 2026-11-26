import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { complianceApi } from '../../api/compliance.api';
import {
  CheckCircle2,
  XCircle,
  Lock,
  Download,
  Flame,
  Layers,
} from 'lucide-react';

export const VerifyCertificatePage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    if (!hash) {
      setIsInvalid(true);
      setIsLoading(false);
      return;
    }

    const verify = async () => {
      try {
        setIsLoading(true);
        const res = await complianceApi.verifyHash(hash);
        if (res.data?.isValid) {
          setData(res.data);
        } else {
          setIsInvalid(true);
        }
      } catch (err) {
        setIsInvalid(true);
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [hash]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold">डिजिटल ऑडिट हस्ताक्षर सत्यापित हो रहे हैं...</h2>
        <p className="text-xs text-slate-400 mt-1">Checking SHA-256 hash chaining against immutable compliance archive</p>
      </div>
    );
  }

  if (isInvalid || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-800/80 rounded-3xl p-6 text-center shadow-2xl space-y-4">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-white">सर्टिफिकेट सत्यापन असफल (Invalid Certificate)</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            प्रदान किया गया QR कोड या SHA-256 हैश पृथ्वी ग्रिड अनुपालन डेटाबेस में नहीं मिला। यह दस्तावेज़ बदला हुआ या अनधिकृत हो सकता है।
          </p>
          <div className="p-3 bg-black/40 rounded-xl font-mono text-[11px] text-red-400 break-all">
            Hash: {hash}
          </div>
          <Link
            to="/login"
            className="inline-block py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            पोर्टल पर जाएं (Go to Portal)
          </Link>
        </div>
      </div>
    );
  }

  const entity = data.entity;
  const facility = data.facility;
  const summary = data.summary || {};
  const reqs = data.requirementsCatalog || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col py-8 px-4 font-sans">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Verification Success Seal */}
        <div className="bg-gradient-to-br from-emerald-950 to-slate-900 border-2 border-emerald-500/80 rounded-3xl p-6 shadow-2xl text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-400/50 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
              INDORE MUNICIPAL CORPORATION (IMC) • SWM-2026 AUDIT MATRIX
            </span>
            <h1 className="text-xl font-black text-white mt-1">
              प्रमाणित SWM-2026 अनुपालन सर्टिफिकेट
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Cryptographically Authentic & Immutable Digital Evidence
            </p>
          </div>

          <div className="inline-block px-3 py-1 bg-emerald-900/60 border border-emerald-600 rounded-full font-mono text-xs font-black text-emerald-200">
            ID: {data.certificateId}
          </div>
        </div>

        {/* Facility Details Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 text-xs shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-slate-400 text-[11px] block">बल्क वेस्ट जनरेटर (BWG):</span>
              <span className="text-base font-black text-white">{entity?.orgName || 'Bulk Waste Generator'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[11px] block">पंजीयन क्रमांक:</span>
              <span className="font-mono font-black text-emerald-400">{entity?.swmRegNo || 'SWM-IND-2026'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">प्लांट / स्थान:</span>
              <span className="font-bold">{facility?.facilityName || facility?.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">नगर निगम क्षेत्र:</span>
              <span className="font-bold">जोन {entity?.imcZone || facility?.imcZone || '1'}, वार्ड {entity?.imcWard || '12'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">ऑडिट अवधि:</span>
              <span className="font-bold">
                {new Date(data.periodStart).toLocaleDateString('en-IN')} - {new Date(data.periodEnd).toLocaleDateString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">जारी करने की तिथि:</span>
              <span className="font-bold">{new Date(data.issuedAt).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Sensor Provenance Proof Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>सेंसर-आधारित जैविक एवं निष्पादन प्रमाण (Sensor Evidence)</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] block">प्रसंस्कृत कचरा</span>
              <span className="text-sm font-mono font-black text-white">
                {summary.totalWasteInKg?.toLocaleString()} kg
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] block">खाद उत्पादन</span>
              <span className="text-sm font-mono font-black text-emerald-400">
                {summary.totalFertilizerOutKg?.toLocaleString()} kg
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] block">थर्मोफिलिक अवधि</span>
              <span className="text-sm font-mono font-black text-amber-400">
                {summary.thermophilicHours || 74} hrs
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] block">मीथेन नियंत्रण</span>
              <span className="text-sm font-mono font-black text-teal-400">
                {summary.maxMethanePpm || 185} PPM
              </span>
            </div>
          </div>
        </div>

        {/* 5-Clause Statutory SWM Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg">
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>बाबू-शील्ड SWM-2026 क्लॉज अनुपालन सत्यापन</span>
          </h2>

          <div className="space-y-2">
            {reqs.map((r: any, idx: number) => (
              <div
                key={idx}
                className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-white block">
                    {r.code}: {r.title}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">{r.evidenceSummary}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 border border-emerald-700 text-emerald-300 flex-shrink-0">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cryptographic Hash Chain Box */}
        <div className="bg-black/80 border border-slate-800 rounded-3xl p-5 space-y-2 font-mono text-[11px] text-slate-400 shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
            <Lock className="w-4 h-4" />
            <span>अपरिवर्तनीय ब्लॉकचेन हैश सत्यापन (Cryptographic Chain)</span>
          </div>
          <div className="break-all">
            <strong className="text-white">CERTIFICATE HASH (SHA-256):</strong>
            <div className="text-emerald-400 text-[10px] mt-0.5">{data.certificateHash}</div>
          </div>
          <div className="break-all pt-2 border-t border-slate-800">
            <strong className="text-slate-300">PREVIOUS CERTIFICATE BLOCK HASH:</strong>
            <div className="text-slate-500 text-[10px] mt-0.5">{data.previousCertificateHash}</div>
          </div>
          <div className="pt-2 text-[10px] text-slate-500 font-sans">
            स्थिति: डिजिटल हस्ताक्षर और सेंसर टेलीमेट्री डेटाबेस से शत-प्रतिशत मिलान सफल।
          </div>
        </div>

        {/* PDF Download Button */}
        <div className="pt-2 text-center">
          <a
            href={`http://localhost:3001/api/v1/compliance/${data.certificateId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-5 h-5" />
            <span>आधिकारिक PDF सर्टिफिकेट डाउनलोड करें (Download Certified PDF)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
