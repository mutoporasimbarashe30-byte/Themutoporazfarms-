import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Stethoscope, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const LoginView: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('mutoporasimbarashe30@gmail.com');
  const [password, setPassword] = useState('SimbaFarm2026!');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setSubmitting(true);
    setError(null);
    try {
      await login(presetEmail, presetPass);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand identity */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-700 text-white font-black text-3xl shadow-xl ring-4 ring-emerald-500/20 mb-4">
            M
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            The Mutoporaz Farms
          </h1>
          <p className="mt-1 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Livestock Operations • Pigs • Hens • Ostriches
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Managed by Farm Director <span className="text-white font-bold">SIMBA</span>
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Account Email / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="simba@mutoporaz.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Authenticating...' : 'Sign In to Farm Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick preset sign-in buttons for fast testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              1-Click Demo Accounts
            </div>

            <div className="space-y-2">
              <button
                id="quick-login-simba"
                onClick={() => handleQuickLogin('mutoporasimbarashe30@gmail.com', 'SimbaFarm2026!')}
                className="w-full py-2 px-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 text-amber-900 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>SIMBA (Admin & Farm Director)</span>
                </div>
                <span className="text-[10px] font-mono text-amber-700">SimbaFarm2026!</span>
              </button>

              <button
                id="quick-login-worker"
                onClick={() => handleQuickLogin('worker@mutoporaz.com', 'WorkerPass123!')}
                className="w-full py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-900 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>John Moyo (Farm Worker)</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-700">WorkerPass123!</span>
              </button>

              <button
                id="quick-login-vet"
                onClick={() => handleQuickLogin('vet@mutoporaz.com', 'VetPass123!')}
                className="w-full py-2 px-3 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/80 text-teal-900 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <span>Dr. Sarah Chikore (Veterinarian)</span>
                </div>
                <span className="text-[10px] font-mono text-teal-700">VetPass123!</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile notice */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Mobile-responsive for on-site field use at the pens, coops & paddocks.
        </p>
      </div>
    </div>
  );
};
