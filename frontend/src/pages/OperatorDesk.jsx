import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, Scale, DollarSign, 
  RefreshCw, Clock, Filter, AlertCircle, Printer, FileSpreadsheet, Building2
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { api, createWebSocket } from '../api';
import { playChime } from '../components/AudioAlert';

export default function OperatorDesk({ user, currentLang }) {
  const t = translations[currentLang] || translations.en;
  
  const [centres, setCentres] = useState([]);
  const [selectedCentreId, setSelectedCentreId] = useState(1);
  const [queue, setQueue] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedBookingForProc, setSelectedBookingForProc] = useState(null);
  
  // Weighbridge & Quality Inspection state
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [moisture, setMoisture] = useState(11.2);
  const [qualityGrade, setQualityGrade] = useState('Grade A');
  const [procRemarks, setProcRemarks] = useState('Sample verified within standard moisture limits.');
  const [submittingProc, setSubmittingProc] = useState(false);

  useEffect(() => {
    loadCentres();
  }, []);

  useEffect(() => {
    if (selectedCentreId) {
      loadTodayQueue();

      const ws = createWebSocket(
        `/centres/${selectedCentreId}`,
        () => loadTodayQueue(),
        (err) => console.log("Operator WS error", err)
      );

      return () => ws.close();
    }
  }, [selectedCentreId, filter]);

  const loadCentres = async () => {
    try {
      const cList = await api.getCentres();
      setCentres(cList);
      if (cList.length > 0) setSelectedCentreId(cList[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTodayQueue = async () => {
    try {
      setLoading(true);
      const data = await api.getTodayQueue(selectedCentreId, filter === 'ALL' ? null : filter);
      setQueue(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (id) => {
    try {
      await api.checkInFarmer(id);
      loadTodayQueue();
    } catch (e) {
      alert(e.message || "Gate check-in failed");
    }
  };

  const handleCallFarmer = async (id, counter = 1) => {
    try {
      await api.callFarmer(id, counter);
      playChime();
      loadTodayQueue();
    } catch (e) {
      alert(e.message || "Failed to broadcast counter call");
    }
  };

  const handleOpenProcurement = (booking) => {
    setSelectedBookingForProc(booking);
    const est = booking.estimated_quantity_quintals;
    const estGross = (est + 25.0).toFixed(1); // truck tare estimate ~25 quintals
    const estTare = (25.0).toFixed(1);
    setGrossWeight(estGross);
    setTareWeight(estTare);
    setNetWeight(est.toFixed(1));
    setMoisture(11.2);
    setQualityGrade('Grade A');
  };

  const handleWeightChange = (newGross, newTare) => {
    const g = parseFloat(newGross) || 0;
    const t = parseFloat(newTare) || 0;
    setGrossWeight(newGross);
    setTareWeight(newTare);
    setNetWeight(Math.max(0, g - t).toFixed(1));
  };

  const handleSubmitProcurement = async (e) => {
    e.preventDefault();
    if (!selectedBookingForProc) return;
    setSubmittingProc(true);
    try {
      await api.recordProcurement({
        booking_id: selectedBookingForProc.id,
        final_quantity_quintals: parseFloat(netWeight),
        moisture_percentage: parseFloat(moisture),
        quality_grade: qualityGrade,
        remarks: procRemarks
      });
      setSelectedBookingForProc(null);
      loadTodayQueue();
    } catch (err) {
      alert(err.message || "Procurement entry failed");
    } finally {
      setSubmittingProc(false);
    }
  };

  const handleQuickMarkPaid = async (bookingId) => {
    try {
      const allPayments = await api.getAllPayments();
      const p = allPayments.find(pay => pay.status === 'PENDING');
      if (p) {
        await api.markPaymentPaid(p.id, {
          status: 'PAID',
          reference_number: `PFMS-DBT-${Math.floor(10000000 + Math.random() * 90000000)}`
        });
        alert("DBT Payment successfully disbursed!");
        loadTodayQueue();
      }
    } catch (e) {
      alert(e.message || "Payment authorization failed");
    }
  };

  const currentCentre = centres.find(c => c.id === parseInt(selectedCentreId));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Yard Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
            APMC Weighbridge & Quality Inspection Terminal
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
            Mandi Inward Operations Desk
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Electronic tare/gross scale interface, moisture certification & DBT billing
          </p>
        </div>

        {/* Mandi Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Active Mandi:</label>
          <select
            value={selectedCentreId}
            onChange={(e) => setSelectedCentreId(e.target.value)}
            className="py-2 px-3 rounded-lg border border-slate-300 font-bold text-xs bg-white focus:ring-2 focus:ring-blue-600"
          >
            {centres.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.district})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Row */}
      {currentCentre && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-400 font-bold uppercase text-[10.5px]">Weighbridge Counters</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{currentCentre.counters_count} Active</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-400 font-bold uppercase text-[10.5px]">Operating Hours</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{currentCentre.operating_hours_start} - {currentCentre.operating_hours_end}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-400 font-bold uppercase text-[10.5px]">Daily Target Cap</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{currentCentre.daily_capacity_quintals} Q</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-400 font-bold uppercase text-[10.5px]">Queue Inward</span>
            <div className="text-xl font-black text-blue-800 mt-0.5">{queue.length} Vehicles</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex gap-2">
          {['ALL', 'WAITING', 'IN_PROGRESS', 'COMPLETED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filter === f
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'ALL' && 'All Scheduled Lots'}
              {f === 'WAITING' && 'At Yard Gate'}
              {f === 'IN_PROGRESS' && 'At Counter (Calling)'}
              {f === 'COMPLETED' && 'Weighment Completed'}
            </button>
          ))}
        </div>
        <button
          onClick={loadTodayQueue}
          className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {queue.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-medium">No vehicle lots in selected stage today.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Token / Pass</th>
                  <th className="p-3.5">Farmer & Vehicle</th>
                  <th className="p-3.5">Crop Lot</th>
                  <th className="p-3.5">Arrival Slot</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Desk Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5">
                      {b.token_number ? (
                        <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                          #{b.token_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Awaiting Entry</span>
                      )}
                      <div className="text-[10px] font-mono text-slate-400 mt-1">{b.booking_code}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{b.farmer_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{b.farmer_phone}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{b.crop_name}</div>
                      <div className="text-[11px] font-semibold text-emerald-800">{b.estimated_quantity_quintals} Q Declared</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-mono text-slate-700 font-medium">{b.slot_time_window}</div>
                      {b.estimated_wait_minutes > 0 && (
                        <div className="text-[10.5px] text-amber-700 font-medium">
                          ~{b.estimated_wait_minutes} mins est. wait
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                        b.status === 'BOOKED' ? 'bg-slate-100 text-slate-700' :
                        b.status === 'CHECKED_IN' ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse' :
                        b.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-900 border border-purple-300 font-black' :
                        b.status === 'PAID' ? 'bg-emerald-100 text-emerald-900' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {b.status}
                        {b.assigned_counter ? ` (C#${b.assigned_counter})` : ''}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      {b.status === 'BOOKED' && (
                        <button
                          onClick={() => handleCheckIn(b.id)}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1 ml-auto"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Gate Entry</span>
                        </button>
                      )}

                      {b.status === 'CHECKED_IN' && (
                        <div className="flex items-center justify-end gap-1.5">
                          {[1, 2, 3].map((counterNum) => (
                            <button
                              key={counterNum}
                              onClick={() => handleCallFarmer(b.id, counterNum)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-sm"
                              title={`Call to Counter #${counterNum}`}
                            >
                              Call C{counterNum}
                            </button>
                          ))}
                        </div>
                      )}

                      {b.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleOpenProcurement(b)}
                          className="px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition flex items-center gap-1.5 ml-auto"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>Weigh & Grade</span>
                        </button>
                      )}

                      {b.status === 'PAYMENT_PENDING' && (
                        <button
                          onClick={() => handleQuickMarkPaid(b.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center gap-1 ml-auto"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Authorize DBT</span>
                        </button>
                      )}

                      {b.status === 'PAID' && (
                        <span className="text-emerald-800 font-bold flex items-center justify-end gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Electronic Weighbridge & Inspection Slip Drawer Modal */}
      {selectedBookingForProc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">SCALE INTERFACE #02</span>
                <h3 className="font-extrabold text-base">Record Weighment & Moisture Reading</h3>
              </div>
              <button onClick={() => setSelectedBookingForProc(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitProcurement} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Token & Lot:</span>
                  <strong className="text-slate-900 font-bold text-sm">#{selectedBookingForProc.token_number} • {selectedBookingForProc.crop_name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10.5px]">Farmer:</span>
                  <strong className="text-slate-900 font-semibold">{selectedBookingForProc.farmer_name}</strong>
                </div>
              </div>

              {/* Gross, Tare, Net Weighbridge Fields */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Gross (Tractor+Lot)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={grossWeight}
                    onChange={(e) => handleWeightChange(e.target.value, tareWeight)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tare (Empty Truck)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={tareWeight}
                    onChange={(e) => handleWeightChange(grossWeight, e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-900 mb-1">Net Weight (Q)</label>
                  <input
                    type="number"
                    step="0.1"
                    readOnly
                    value={netWeight}
                    className="w-full p-2 rounded-lg border border-emerald-300 bg-emerald-50/70 font-mono font-black text-xs text-emerald-900"
                  />
                </div>
              </div>

              {/* Moisture & Grade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Moisture Meter Reading (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={moisture}
                    onChange={(e) => setMoisture(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Permissible limit: &lt;12.0%</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Grain Quality Grade</label>
                  <select
                    value={qualityGrade}
                    onChange={(e) => setQualityGrade(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold text-xs bg-white"
                  >
                    <option value="Grade A">Fair Average Quality (FAQ) - Grade A</option>
                    <option value="Grade B">Standard Commercial Grade</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Inspector Sign-off Remarks</label>
                <input
                  type="text"
                  value={procRemarks}
                  onChange={(e) => setProcRemarks(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForProc(null)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProc}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition"
                >
                  {submittingProc ? "Recording..." : "Certify Weighment & Issue DBT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
