import React, { useState } from 'react';
import { Sprout, ShieldCheck, CheckCircle2, Phone, Lock, User, ArrowRight, Building2, Award } from 'lucide-react';
import { translations } from '../i18n/translations';
import { api } from '../api';

export default function AuthPage({ onAuthSuccess, currentLang }) {
  const t = translations[currentLang] || translations.en;
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('FARMER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await api.register({
          phone,
          name,
          password,
          role,
          language_pref: currentLang
        });
      }
      const tokenData = await api.login({ phone, password });
      onAuthSuccess(tokenData);
    } catch (err) {
      setError(err.message || "Authentication failed. Check your mobile number and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoPhone, demoPassword) => {
    setError('');
    setLoading(true);
    try {
      const tokenData = await api.login({ phone: demoPhone, password: demoPassword });
      onAuthSuccess(tokenData);
    } catch (err) {
      setError(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Side: National Agricultural e-Procurement Notice Board */}
        <div className="md:col-span-5 bg-emerald-900 text-white p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-emerald-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-[10.5px] font-bold uppercase tracking-wider mb-6">
              <Award className="w-3.5 h-3.5" />
              <span>Government of India e-NAM Initiative</span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white leading-snug">
              National Agricultural Procurement & Queue System
            </h2>
            <p className="text-xs text-emerald-200/90 mt-2 leading-relaxed">
              Guaranteed Minimum Support Price (MSP) intake with scheduled mandi arrival windows to eliminate waiting delays.
            </p>

            {/* Official MSP Rates Bulletin */}
            <div className="mt-6 pt-5 border-t border-emerald-800/80 space-y-2 text-xs">
              <div className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                CURRENT GOVT. MSP RATES (2026-27):
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div className="bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/50">
                  <span className="text-emerald-300 block text-[10px]">Wheat (गेहूं / ಗೋಧಿ):</span>
                  <strong className="text-white font-bold">₹2,275 / Q</strong>
                </div>
                <div className="bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/50">
                  <span className="text-emerald-300 block text-[10px]">Ragi (ರಾಘಿ / ರಾಗಿ):</span>
                  <strong className="text-white font-bold">₹3,846 / Q</strong>
                </div>
                <div className="bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/50">
                  <span className="text-emerald-300 block text-[10px]">Paddy (धान / ಭತ್ತ):</span>
                  <strong className="text-white font-bold">₹2,183 / Q</strong>
                </div>
                <div className="bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/50">
                  <span className="text-emerald-300 block text-[10px]">Soybean (सोयाबीन):</span>
                  <strong className="text-white font-bold">₹4,600 / Q</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-emerald-800/60 text-[11px] text-emerald-300/80 flex items-center justify-between">
            <span>Direct Benefit Transfer (DBT)</span>
            <span>Zero Mandi Toll</span>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className={`pb-3 text-sm font-bold transition border-b-2 mr-6 ${
                  !isRegister
                    ? "border-emerald-700 text-emerald-900"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                {t.login}
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className={`pb-3 text-sm font-bold transition border-b-2 ${
                  isRegister
                    ? "border-emerald-700 text-emerald-900"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                {t.register}
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.name}</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Patil"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.phone}</label>
                <div className="relative flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-xs font-mono font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 rounded-r-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.password}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
                  />
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.role}</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm bg-white"
                  >
                    <option value="FARMER">{t.farmer}</option>
                    <option value="OPERATOR">{t.operator}</option>
                    <option value="ADMIN">{t.admin}</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs tracking-wider uppercase transition shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>{isRegister ? t.register : t.login}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Authentic Test Credentials Palette for Evaluation */}
          <div className="mt-8 pt-5 border-t border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Authorized Evaluation Profiles:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoLogin("9876543210", "Farmer@123")}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition group"
              >
                <div className="font-bold text-slate-900 group-hover:text-emerald-900">Ramesh Patil</div>
                <div className="text-[10.5px] text-slate-500">Farmer • Dharwad APMC (ಕನ್ನಡ)</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("9876543211", "Farmer@123")}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition group"
              >
                <div className="font-bold text-slate-900 group-hover:text-emerald-900">Suresh Kumar</div>
                <div className="text-[10.5px] text-slate-500">Farmer • Mandi Grain (हिंदी)</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("8888888888", "Operator@123")}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 transition group"
              >
                <div className="font-bold text-slate-900 group-hover:text-blue-900">Mandi Operator</div>
                <div className="text-[10.5px] text-slate-500">Weighbridge Terminal Desk</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("9999999999", "Admin@123")}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-purple-600 hover:bg-purple-50/50 transition group"
              >
                <div className="font-bold text-slate-900 group-hover:text-purple-900">Procurement Officer</div>
                <div className="text-[10.5px] text-slate-500">State Telemetry Dashboard</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
