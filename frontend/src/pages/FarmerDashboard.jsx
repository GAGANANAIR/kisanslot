import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, CheckCircle2, ChevronRight, 
  MapPin, RefreshCw, DollarSign, Plus, BellRing, FileText, QrCode, AlertCircle
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { api, createWebSocket } from '../api';
import BookSlotModal from './BookSlotModal';
import GatePassModal from '../components/GatePassModal';
import { playChime } from '../components/AudioAlert';

export default function FarmerDashboard({ user, currentLang, onTriggerNotificationFetch }) {
  const t = translations[currentLang] || translations.en;
  
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedPassBooking, setSelectedPassBooking] = useState(null);
  const [liveQueueData, setLiveQueueData] = useState(null);
  const [calledAlert, setCalledAlert] = useState(null);

  useEffect(() => {
    fetchFarmerData();

    // Setup private WebSocket for this farmer
    const ws = createWebSocket(
      `/farmers/${user.id}`,
      (payload) => {
        if (payload.event === "TOKEN_ASSIGNED" || payload.event === "QUEUE_ADVANCED") {
          setLiveQueueData(payload.data);
          fetchFarmerData();
        } else if (payload.event === "CALLED_TO_COUNTER") {
          setCalledAlert(payload.data);
          playChime();
          fetchFarmerData();
        } else if (payload.event === "PROCUREMENT_RECORDED" || payload.event === "PAYMENT_COMPLETED") {
          fetchFarmerData();
          if (onTriggerNotificationFetch) onTriggerNotificationFetch();
        }
      },
      (err) => console.log("Farmer WS closed", err)
    );

    return () => ws.close();
  }, [user.id]);

  const fetchFarmerData = async () => {
    try {
      setLoading(true);
      const [bList, pList] = await Promise.all([
        api.getMyBookings(),
        api.getFarmerPayments()
      ]);
      setBookings(bList);
      setPayments(pList);

      const activeQueueBooking = bList.find(b => b.status === "CHECKED_IN" || b.status === "IN_PROGRESS");
      if (activeQueueBooking) {
        try {
          const qStatus = await api.getLiveQueueStatus(activeQueueBooking.id);
          setLiveQueueData(qStatus);
        } catch (e) {
          console.error("Queue check error", e);
        }
      } else {
        setLiveQueueData(null);
      }
    } catch (err) {
      console.error("Error loading farmer data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this procurement slot?")) return;
    try {
      await api.cancelBooking(id);
      fetchFarmerData();
    } catch (err) {
      alert(err.message || "Could not cancel booking");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'BOOKED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">{t.status_booked}</span>;
      case 'CHECKED_IN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">{t.status_checked_in}</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">{t.status_in_progress}</span>;
      case 'PROCURED':
      case 'PAYMENT_PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">{t.status_procured}</span>;
      case 'PAID':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">✓ {t.status_paid}</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Real-time Loudspeaker Calling Banner */}
      {calledAlert && (
        <div className="bg-amber-500 text-slate-950 p-5 rounded-2xl shadow-lg border-2 border-amber-400 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 text-amber-400 rounded-xl">
              <BellRing className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wider text-slate-950">
                {t.called_alert}
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {t.proceed_to} <span className="underline font-black text-base">#{calledAlert.counter_number}</span> (Token #{calledAlert.token_number})
              </div>
            </div>
          </div>
          <button
            onClick={() => setCalledAlert(null)}
            className="px-4 py-2 bg-slate-950 text-white font-bold rounded-xl text-xs hover:bg-slate-900 transition shadow"
          >
            I am at Counter
          </button>
        </div>
      )}

      {/* Welcome & Action Strip */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Registered Kisan Account
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
            {user.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Mobile: <span className="font-mono text-slate-700">{user.phone}</span> • Aadhaar DBT Linked
          </p>
        </div>

        <button
          onClick={() => setIsBookModalOpen(true)}
          className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t.book_slot}</span>
        </button>
      </div>

      {/* Live Yard Queue Ticket (When Checked-In or At Weighbridge) */}
      {liveQueueData && (
        <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-md space-y-6">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                {t.live_queue}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {liveQueueData.centre_name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {t.token}
              </span>
              <div className="text-4xl font-black text-white font-mono mt-1">
                #{liveQueueData.token_number || "—"}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Pass: {liveQueueData.booking_code}
              </span>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {t.people_ahead}
              </span>
              <div className="text-3xl font-black text-amber-300 mt-1">
                {liveQueueData.status === "IN_PROGRESS" ? "AT COUNTER" : `${liveQueueData.people_ahead} Trucks Ahead`}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {liveQueueData.active_counters} Operating Counters
              </span>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {t.est_wait}
              </span>
              <div className="text-3xl font-black text-white mt-1">
                {liveQueueData.status === "IN_PROGRESS" ? "0 mins" : `~${liveQueueData.estimated_wait_minutes} ${t.minutes}`}
              </div>
              <span className="text-[11px] text-emerald-300 mt-1 block font-medium">
                {liveQueueData.assigned_counter ? `Assigned to Counter #${liveQueueData.assigned_counter}` : "Weighbridge call announcement active"}
              </span>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="pt-2">
            <div className="grid grid-cols-4 gap-2 text-center text-[10.5px]">
              <div className="text-emerald-400 font-bold">1. Slot Booked ✓</div>
              <div className="text-emerald-400 font-bold">2. Gate Entered ✓</div>
              <div className={liveQueueData.status === "IN_PROGRESS" ? "text-amber-400 font-bold" : "text-slate-500 font-medium"}>
                3. Weighbridge Call
              </div>
              <div className="text-slate-500 font-medium">4. DBT Settlement</div>
            </div>
          </div>
        </div>
      )}

      {/* Bookings & Passes List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-800" />
            <h2 className="text-base font-bold text-slate-900">{t.my_bookings}</h2>
          </div>
          <button
            onClick={fetchFarmerData}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-medium">No procurement slots booked yet.</p>
            <button
              onClick={() => setIsBookModalOpen(true)}
              className="mt-3 px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition"
            >
              {t.book_slot}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      {b.booking_code}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 mt-0.5">
                      {b.crop_name}
                    </h3>
                  </div>
                  {getStatusBadge(b.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Mandi Centre:</span>
                    <strong className="text-slate-800">{b.centre_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Quantity:</span>
                    <strong className="text-slate-800">{b.estimated_quantity_quintals} Q</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Arrival Date:</span>
                    <strong className="text-slate-800">{b.slot_date}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Time Window:</span>
                    <strong className="text-emerald-800 font-mono">{b.slot_time_window}</strong>
                  </div>
                </div>

                {/* Gate Pass Action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => setSelectedPassBooking(b)}
                    className="flex items-center gap-1.5 font-bold text-emerald-800 hover:text-emerald-950 transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View Official e-Gate Pass</span>
                  </button>

                  {b.status === 'BOOKED' && (
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct Benefit Transfer (DBT) Bank Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <DollarSign className="w-5 h-5 text-emerald-800" />
          <h2 className="text-base font-bold text-slate-900">{t.payment_status}</h2>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No payment records yet. DBT payouts are initiated upon weighment.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map((p) => (
              <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg text-slate-900">
                      ₹{p.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                      p.status === 'PAID' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {p.status === 'PAID' ? 'DBT Released' : 'Processing via PFMS'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Crop: <strong className="text-slate-800">{p.crop_name}</strong> • Mode: {p.payment_mode}
                  </p>
                  {p.reference_number && (
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      Bank UTR: {p.reference_number}
                    </p>
                  )}
                </div>
                <div className="text-xs text-slate-500 text-right">
                  {p.paid_at ? `Credited: ${new Date(p.paid_at).toLocaleDateString()}` : "Awaiting Bank Settlement"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Slot Modal */}
      <BookSlotModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onBookingCreated={() => {
          fetchFarmerData();
          if (onTriggerNotificationFetch) onTriggerNotificationFetch();
        }}
        currentLang={currentLang}
      />

      {/* Gate Pass Print Modal */}
      <GatePassModal
        booking={selectedPassBooking}
        onClose={() => setSelectedPassBooking(null)}
      />
    </div>
  );
}
