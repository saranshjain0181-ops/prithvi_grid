import React, { useState } from 'react';
import { Camera, Upload, AlertTriangle, CheckCircle2, RefreshCw, X, Sparkles } from 'lucide-react';
import { apiClient } from '../../api/client';

interface VisionAnalysis {
  compostPhase: string;
  textureQuality: string;
  visualMoistureEstimate: string;
  estimatedDecompositionScorePct: number;
  contaminantsDetected: string[];
  contaminantRiskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  turningVerification?: {
    turningNeeded: boolean;
    evidenceOfAeration: boolean;
    reason: string;
  };
  recommendations: string[];
}

interface CompostVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitId?: string;
}

export const CompostVisionModal: React.FC<CompostVisionModalProps> = ({
  isOpen,
  onClose,
  pitId = 'Pit 1 (Compost Box A)',
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAnalysis(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.post('/ai/vision', {
        imageBase64: selectedImage,
        mimeType: 'image/jpeg',
        pitId,
      });

      if (res.data?.success && res.data?.data) {
        setAnalysis(res.data.data);
      } else {
        setError('Failed to analyze image. Please try again.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Vision service error. Reverting to fallback.');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (type: 'MATURE' | 'RAW') => {
    // Generate simple data URL representation
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 200;
    sampleCanvas.height = 200;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = type === 'MATURE' ? '#2e1c0c' : '#5c4033';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText(type === 'MATURE' ? 'Mature Humus' : 'Active Pit', 40, 100);
      setSelectedImage(sampleCanvas.toDataURL('image/jpeg'));
      setAnalysis(null);
      setError(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Computer Vision Compost Inspector</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  GEMINI VISION
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Surface texture analysis, visual moisture, decomposition score & contaminant check
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload & Preview Area */}
        <div className="space-y-4">
          {!selectedImage ? (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex justify-center">
                <Upload className="w-10 h-10 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Upload or capture compost pit photo
                </p>
                <p className="text-[11px] text-slate-400">Supported formats: JPG, PNG, WebP (Max 10MB)</p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                  <span>Browse Device Photos</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={() => loadSample('MATURE')}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                >
                  Load Mature Sample
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden max-h-56 border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center">
                <img src={selectedImage} alt="Compost pit preview" className="object-contain max-h-56 w-auto" />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setAnalysis(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs"
                >
                  Change Photo
                </button>
              </div>

              {!analysis && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing Texture & Contaminants with Gemini Vision...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Run AI Vision Inspection</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          {/* Analysis Results Display */}
          {analysis && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in">
              {/* Score & Phase Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Compost Phase
                  </span>
                  <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{analysis.compostPhase.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Decomposition Score
                  </span>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {analysis.estimatedDecompositionScorePct}%
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${analysis.estimatedDecompositionScorePct}%` }}
                />
              </div>

              {/* Texture & Moisture Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">Texture Quality</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {analysis.textureQuality.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">Visual Moisture</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {analysis.visualMoistureEstimate.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 font-bold block">Contaminant Risk</span>
                  <span
                    className={`font-black ${
                      analysis.contaminantRiskLevel === 'NONE'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {analysis.contaminantRiskLevel}
                  </span>
                </div>
              </div>

              {/* Contaminants Alert */}
              {analysis.contaminantsDetected.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Non-Biodegradable Foreign Items Detected:</span>
                  </div>
                  <ul className="list-disc pl-5 text-amber-700 dark:text-amber-300">
                    {analysis.contaminantsDetected.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Agronomic Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    AI Agronomic Recommendations
                  </span>
                  <div className="space-y-1">
                    {analysis.recommendations.map((rec, rIdx) => (
                      <div
                        key={rIdx}
                        className="flex items-start gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
