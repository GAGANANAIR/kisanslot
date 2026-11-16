import React, { useState, useEffect } from 'react';
import { Radio, Users, Volume2, Clock, Sparkles, Building2 } from 'lucide-react';
import { api, createWebSocket } from '../api';
import { playChime } from '../components/AudioAlert';

export default function PublicDisplayBoard() {
  const [centreId, setCentreId] = useState(1);
  const [centre, setCentre] = useState(null);
  const [queue, setQueue] = useState([]);
  const [calledAnnouncement, setCalledAnnouncement] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadData();

    const ws = createWebSocket(
      `/centres/${centreId}`,
      (payload) => {
        if (payload.event === "FARMER_CALLED") {
          setCalledAnnouncement(payload.data);
          playChime();
          setTimeout(() => setCalledAnnouncement(null), 12000);
        }
        loadData();
      },
      (err) => console.log("Display board WS err", err)
    );

    const interval = setInterval(loadData, 10000);
    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [centreId]);

  const loadData = async () => {
    try {
      const [cList, qList] = await Promise.all([
        api.getCentres(),
        api.getTodayQueue(centreId)
      ]);
      const current = cList.find(c => c.id === parseInt(centreId));
      setCentre(current);
      setQueue(qList);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    }
  };

  const inProgress = queue.filter(b => b.status === "IN_PROGRESS");
  const waiting = queue.filter(b => b.status === "CHECKED_IN" || b.status === "BOOKED");
  const completed = queue.filter(b => b.status === "PROCURED" || b.status === "PAID" || b.status === "PAYMENT_PENDING");

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col p-4 sm:p-6 select-none">
      {/* Top TV Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-md">
            <Radio className="w-6 h-6 animate-pulse text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                {centre ? centre.name : "APMC Procurement Yard"}
              </h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                LIVE QUEUE TV
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Department of Agriculture • Electronic Token Calling Display
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="text-xs text-slate-400">
            <div>Active Weighbridges: <strong className="text-white font-mono">{centre?.counters_count || 3}</strong></div>
            <div>Sync Time: <strong className="text-slate-300 font-mono">{lastUpdate.toLocaleTimeString()}</strong></div>
          </div>
          <a
            href="#/"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition"
          >
            ← Exit TV Mode
          </a>
        </div>
      </header>

      {/* Flashing Calling Notice */}
      {calledAnnouncement && (
        <div className="my-4 p-5 bg-amber-500 text-slate-950 rounded-2xl shadow-2xl flex items-center justify-between animate-pulse border-2 border-yellow-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-950 text-amber-400 rounded-xl">
              <Volume2 className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs uppercase font-extrabold tracking-widest text-slate-950">
                LOUDSPEAKER CALLING NOTICE
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-0.5">
                TOKEN #{calledAnnouncement.token_number} — {calledAnnouncement.farmer_name}
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                Crop: {calledAnnouncement.crop_name} • Move vehicle immediately to Weighbridge #{calledAnnouncement.counter_number}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-black bg-slate-950 text-white px-5 py-2.5 rounded-xl shadow-lg font-mono">
              COUNTER #{calledAnnouncement.counter_number}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Active Counters vs Waiting Queue */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left: Active Counters (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-extrabold tracking-wider text-emerald-400 uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>NOW SERVING AT WEIGHBRIDGES</span>
            </h2>
            <span className="text-xs text-slate-400">Proceed when called</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {[1, 2, 3].map((counterNum) => {
              const activeBooking = inProgress.find(b => b.assigned_counter === counterNum);
              return (
                <div
                  key={counterNum}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    activeBooking
                      ? "bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                      : "bg-slate-900/40 border-slate-800 text-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                      COUNTER #{counterNum}
                    </span>
                    {activeBooking ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-mono">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                        WEIGHING
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">Available</span>
                    )}
                  </div>

                  <div className="my-5 text-center">
                    {activeBooking ? (
                      <>
                        <div className="text-5xl font-black text-white font-mono tracking-tight">
                          #{activeBooking.token_number}
                        </div>
                        <div className="text-base font-bold text-emerald-300 mt-2">
                          {activeBooking.farmer_name}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {activeBooking.crop_name} • {activeBooking.estimated_quantity_quintals} Q
                        </div>
                      </>
                    ) : (
                      <div className="py-6 text-slate-600 text-xs font-semibold">
                        Awaiting next vehicle
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 text-center border-t border-slate-800 pt-2 font-mono">
                    {activeBooking ? `Gate Pass: ${activeBooking.booking_code}` : "Next in line will be announced"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Waiting Queue (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/60 rounded-2xl p-5 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-extrabold tracking-wider text-amber-400 uppercase flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>UPCOMING IN LINE ({waiting.length})</span>
            </h2>
            <span className="text-xs text-slate-400">Est. turnaround: ~15m</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1 max-h-[480px]">
            {waiting.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No vehicles currently waiting in yard queue.</p>
              </div>
            ) : (
              waiting.map((b, idx) => (
                <div
                  key={b.id}
                  className="p-3 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-700/80 font-black text-xs flex items-center justify-center text-slate-300 font-mono">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white text-xs">
                        {b.token_number ? `Token #${b.token_number}` : b.booking_code}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {b.farmer_name} • <span className="text-slate-300">{b.crop_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                      b.status === "CHECKED_IN"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-slate-700 text-slate-300"
                    }`}>
                      {b.status === "CHECKED_IN" ? "In Yard" : "Scheduled"}
                    </span>
                    {b.estimated_wait_minutes > 0 && (
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        ~{b.estimated_wait_minutes}m wait
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-400">
            <span>Completed Today: <strong className="text-emerald-400 font-mono">{completed.length}</strong></span>
            <span>Total Intake Today: <strong className="text-white font-mono">{queue.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Bilingual Running News Ticker at Bottom */}
      <footer className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between overflow-hidden">
        <div className="truncate">
          🌾 <strong className="text-slate-200">NOTICE:</strong> Farmers are requested to keep physical Aadhaar Card & Bank Passbook ready. Direct Benefit Transfer (DBT) will be credited within 48 hours of weighment certification.
        </div>
        <div className="flex-shrink-0 ml-4 font-mono text-[10px] text-emerald-400 font-bold">
          eNAM-CENTRE-HUB-OK
        </div>
      </footer>
    </div>
  );
}
