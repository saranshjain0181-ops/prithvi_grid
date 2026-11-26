import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      setErrorMessage('कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await authApi.sendOtp(phone);
      setSessionId(res.data.sessionId);
      setStep('OTP');
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'नंबर सिस्टम में नहीं मिला। सुपरवाइजर से संपर्क करें।'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      setErrorMessage('कृपया सही OTP दर्ज करें');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await authApi.verifyOtp({ phone, otp, sessionId });
      const { accessToken, refreshToken, user } = res.data;

      login({ accessToken, refreshToken }, user);

      if (user.role === 'SAFAI_MITRA') {
        navigate('/safai-mitra/dashboard');
      } else {
        navigate('/manager/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'गलत OTP दर्ज किया गया है।');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Developer Bypass for Testing / Demo
  const handleDevBypass = () => {
    login(
      { accessToken: 'dev-mock-token', refreshToken: 'dev-mock-refresh' },
      { id: 'dev-user-1', phone: '9876543210', role: 'MANAGER', name: 'Saransh Jain' }
    );
    navigate('/manager/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 transition-colors duration-200 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-950/80 rounded-2xl text-3xl">
            🌱
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            पृथ्वी ग्रिड
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Prithvi Grid • Smart Compost Monitoring
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-xs font-black text-red-700 dark:text-red-300 text-center">
            {errorMessage}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
                अपना मोबाइल नंबर डालें:
              </label>
              <div className="flex items-center gap-2">
                <span className="p-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-300">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="flex-1 p-3.5 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-emerald-600 rounded-2xl text-2xl font-black font-mono tracking-wider focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || phone.length < 10}
              className={`w-full py-4 rounded-2xl font-black text-xl shadow-lg transition-all tactile-btn flex items-center justify-center gap-2 ${
                phone.length >= 10
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{isLoading ? 'जांच हो रही है...' : 'आगे बढ़ें (OTP भेजें) →'}</span>
            </button>

            {/* Quick Demo Bypass Button */}
            <button
              type="button"
              onClick={handleDevBypass}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm transition-all border border-slate-300 dark:border-slate-700"
            >
              🚀 Skip to Dashboard (Dev Bypass)
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-black text-slate-800 dark:text-slate-200">
                  OTP दर्ज करें:
                </label>
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  नंबर बदलें ({phone})
                </button>
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full p-4 border-2 border-emerald-500 dark:bg-slate-800 dark:text-white rounded-2xl text-4xl text-center font-black font-mono tracking-widest focus:outline-none"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length < 4}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xl shadow-lg transition-all tactile-btn"
            >
              {isLoading ? 'सत्यापित हो रहा है...' : 'लॉगिन करें (Login) ✓'}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            सिर्फ अधिकृत BWG और सफाई मित्रों के लिए • इंदौर नगर निगम (IMC)
          </p>
        </div>
      </div>
    </div>
  );
};
