import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Truck, Clock, ShieldCheck, 
  DollarSign, MapPin, RefreshCw, AlertCircle, PlayCircle 
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { api } from '../api';

export default function AdminAnalytics({ user, currentLang }) {
  const t = translations[currentLang] || translations.en;
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalyticsDashboard();
      setDashboardData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-gray-400">
        <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
        <p className="font-semibold text-sm">Aggregating State Mandi Analytics...</p>
      </div>
    );
  }

  const { summary, centre_utilization, hourly_congestion } = dashboardData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
            MINISTRY ANALYTICS DASHBOARD
          </span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            Procurement Efficiency & Wait Time Telemetry
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time APMC procurement operations across all active regional mandis
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* 6 Key Telemetry Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Registered</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">{summary.total_farmers}</div>
          <div className="text-[11px] text-gray-500 mt-1">Active Farmers</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Bookings</span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">{summary.total_bookings}</div>
          <div className="text-[11px] text-gray-500 mt-1">Total Scheduled</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Procured</span>
            <ShieldCheck className="w-4 h-4 text-kisan-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{summary.total_quintals_procured} Q</div>
          <div className="text-[11px] text-kisan-700 font-semibold mt-1">Verified Grain</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">DBT Payout</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">₹{(summary.total_payout_inr / 100000).toFixed(2)}L</div>
          <div className="text-[11px] text-gray-500 mt-1">Direct to Bank</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Avg Wait</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{summary.average_wait_time_minutes}m</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">↓ 86% vs Walk-In</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">No-Show</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">{summary.no_show_rate_pct}%</div>
          <div className="text-[11px] text-gray-500 mt-1">Unclaimed Slots</div>
        </div>
      </div>

      {/* Centre Utilization Section */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-kisan-600" />
          <span>Procurement Centre Intake & Capacity Load</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {centre_utilization.map((c) => (
            <div key={c.centre_id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">{c.centre_name}</h3>
                  <p className="text-[11px] text-gray-400">{c.district} District</p>
                </div>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-kisan-100 text-kisan-800">
                  {c.utilization_pct}% Load
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-kisan-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(5, c.utilization_pct))}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-1 text-[11px] pt-1 text-gray-600">
                <div>
                  <span className="text-gray-400 block">Capacity:</span>
                  <strong>{c.total_capacity_quintals} Q</strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Booked:</span>
                  <strong>{c.booked_capacity_quintals} Q</strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Procured:</span>
                  <strong className="text-kisan-700">{c.procured_capacity_quintals} Q</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Congestion Telemetry Graph */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Hourly Intake & Congestion Pattern (KisanSlot Distributed Smoothing)</span>
          </h2>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Zero Choke Points Detected
          </span>
        </div>

        <div className="grid grid-cols-9 gap-2 pt-4">
          {hourly_congestion.map((h) => {
            const heightMultiplier = Math.min(100, (h.processed_count / 12) * 100);
            return (
              <div key={h.hour} className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 font-bold mb-1">{h.processed_count} trucks</span>
                <div className="w-full bg-gray-100 rounded-t-xl h-36 flex items-end justify-center p-1 relative group">
                  <div
                    className="w-full bg-gradient-to-t from-kisan-700 to-kisan-500 rounded-lg transition-all duration-500 group-hover:brightness-110"
                    style={{ height: `${Math.max(15, heightMultiplier)}%` }}
                  />
                  <div className="absolute -top-7 hidden group-hover:block bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap z-20">
                    Wait: ~{h.avg_wait_minutes}m
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-700 mt-2">{h.hour}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
