import React, { useState } from 'react';
import { Sprout, Bell, Globe, LogOut, ChevronDown, User, ShieldCheck, Tv, LayoutDashboard, Truck } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function Navbar({
  user,
  onLogout,
  currentLang,
  onChangeLang,
  unreadCount,
  onOpenNotifications,
  isWsConnected,
  onSwitchRole
}) {
  const t = translations[currentLang] || translations.en;
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Tricolor Government Portal Top Strip */}
      <div className="h-1 bg-gradient-to-r from-amber-600 via-white to-emerald-700" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-3">
            <a href="#/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-sm transition group-hover:bg-emerald-900">
                <Sprout className="w-6 h-6 text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900">
                    {t.app_title}
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className={`h-1.5 w-1.5 rounded-full ${isWsConnected ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                    {isWsConnected ? "Live Yard Sync" : "Connecting..."}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                  {t.dept_title} • {t.portal_sub}
                </p>
              </div>
            </a>
          </div>

          {/* Right Navigation & Tools */}
          <div className="flex items-center gap-3">
            {/* Language Selection */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold text-slate-700">
              <Globe className="w-3.5 h-3.5 ml-1 mr-1 text-slate-400" />
              <button
                onClick={() => onChangeLang('en')}
                className={`px-2 py-1 rounded transition ${currentLang === 'en' ? 'bg-white shadow-sm text-emerald-900 font-bold' : 'hover:text-slate-900'}`}
              >
                EN
              </button>
              <button
                onClick={() => onChangeLang('hi')}
                className={`px-2 py-1 rounded transition ${currentLang === 'hi' ? 'bg-white shadow-sm text-emerald-900 font-bold' : 'hover:text-slate-900'}`}
              >
                हिंदी
              </button>
              <button
                onClick={() => onChangeLang('kn')}
                className={`px-2 py-1 rounded transition ${currentLang === 'kn' ? 'bg-white shadow-sm text-emerald-900 font-bold' : 'hover:text-slate-900'}`}
              >
                ಕನ್ನಡ
              </button>
            </div>

            {/* Public TV Board Shortcut */}
            <a
              href="#display"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
              title="Open Live Public Waiting Hall Display"
            >
              <Tv className="w-3.5 h-3.5 text-slate-500" />
              <span>Mandi TV Board</span>
            </a>

            {user && (
              <>
                {/* Notification Bell */}
                <button
                  onClick={onOpenNotifications}
                  className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                  title="Official Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* User Dropdown with Portal Switcher */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
                      {user.name.charAt(0)}
                    </div>
                    <div className="hidden md:flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-900 max-w-[130px] truncate leading-tight">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider">
                        {user.role}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 text-xs">
                      <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-xl mb-1">
                        <div className="font-bold text-slate-900">{user.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{user.phone}</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase mt-1 tracking-wider">
                          Current Role: {user.role}
                        </div>
                      </div>

                      {/* Switch Portal Links (Human-Grade Multi-Role Switching) */}
                      <div className="py-1 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 pt-1">
                          Switch Operations Portal
                        </div>
                        <button
                          onClick={() => { onSwitchRole('FARMER'); setIsProfileOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-semibold transition ${user.role === 'FARMER' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          <Truck className="w-4 h-4 text-emerald-700" />
                          <span>Farmer Portal (Mobile View)</span>
                        </button>
                        <button
                          onClick={() => { onSwitchRole('OPERATOR'); setIsProfileOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-semibold transition ${user.role === 'OPERATOR' ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          <ShieldCheck className="w-4 h-4 text-blue-700" />
                          <span>Mandi Desk (Weighbridge & Quality)</span>
                        </button>
                        <button
                          onClick={() => { onSwitchRole('ADMIN'); setIsProfileOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-semibold transition ${user.role === 'ADMIN' ? 'bg-purple-50 text-purple-900 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          <LayoutDashboard className="w-4 h-4 text-purple-700" />
                          <span>State Procurement Analytics</span>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-100 mt-1">
                        <button
                          onClick={() => { onLogout(); setIsProfileOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{t.logout}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
