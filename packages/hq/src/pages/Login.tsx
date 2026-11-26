import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { ThemeToggle } from '../components/layout/ThemeToggle';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setErr(null);
      const res = await axios.post('/api/v1/auth/send-otp', { phone });
      setSessionId(res.data.data.sessionId);
      setStep('OTP');
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Access Denied: Unregistered supreme authority');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setErr(null);
      const res = await axios.post('/api/v1/auth/verify-otp', { phone, otp, sessionId });
      const { accessToken, user } = res.data.data;

      if (user.role !== 'SUPREME_HEAD') {
        setErr('Forbidden: Only Supreme Head and certified technicians authorized.');
        return;
      }

      localStorage.setItem('accessToken', accessToken);
      login({
        ...user,
        token: accessToken,
      });
      navigate('/');
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Invalid authorization code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 transition-colors duration-200 relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 transition-colors">
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-3xl">
            👑
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            PRITHVI GRID HQ
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Supreme Command Center • Restricted Access
          </p>
        </div>

        {err && (
          <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-700 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 text-center">
            {err}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">
                Authorized Authority Phone:
              </label>
              <input
                type="tel"
                maxLength={10}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="1234567890"
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-2xl text-xl font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || phone.length < 10}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase rounded-2xl tracking-wider transition-all shadow-lg"
            >
              {isLoading ? 'Verifying Credentials...' : 'Request Supreme OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                  Enter 4/6-Digit Authority Token:
                </label>
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Change ({phone})
                </button>
              </div>
              <input
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500 rounded-2xl text-3xl text-center font-mono font-black text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length < 4}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase rounded-2xl tracking-wider transition-all shadow-xl"
            >
              {isLoading ? 'Authenticating...' : 'Enter Supreme Mission Control ✓'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
export default Login;
