import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Sparkles, Check, AlertCircle, ShieldCheck, Truck } from 'lucide-react';
import { translations } from '../i18n/translations';
import { api } from '../api';

export default function BookSlotModal({ isOpen, onClose, onBookingCreated, currentLang }) {
  const t = translations[currentLang] || translations.en;
  
  const [centres, setCentres] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedCentre, setSelectedCentre] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [quantity, setQuantity] = useState(30);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [recommendedSlots, setRecommendedSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [cList, crList] = await Promise.all([
        api.getCentres(),
        api.getCrops()
      ]);
      setCentres(cList);
      setCrops(crList);
      if (cList.length > 0) setSelectedCentre(cList[0].id);
      if (crList.length > 0) setSelectedCrop(crList[0].id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFindSmartSlots = async (e) => {
    e?.preventDefault();
    if (!selectedCentre || !selectedCrop || !quantity) return;
    setLoadingSlots(true);
    setError('');
    try {
      const slots = await api.recommendSlots(selectedCentre, selectedCrop, quantity, date);
      setRecommendedSlots(slots);
      if (slots.length > 0) {
        setSelectedSlotId(slots[0].id);
      } else {
        setSelectedSlotId(null);
      }
    } catch (err) {
      setError(err.message || "Failed to calculate recommendations");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlotId) return;
    setBookingInProgress(true);
    setError('');
    try {
      const newBooking = await api.createBooking({
        centre_id: parseInt(selectedCentre),
        slot_id: parseInt(selectedSlotId),
        crop_id: parseInt(selectedCrop),
        estimated_quantity_quintals: parseFloat(quantity)
      });
      onBookingCreated(newBooking);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to confirm booking");
    } finally {
      setBookingInProgress(false);
    }
  };

  if (!isOpen) return null;

  const currentCropObj = crops.find(c => c.id === parseInt(selectedCrop));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 text-slate-800 my-8">
        {/* Header */}
        <div className="bg-emerald-900 text-white p-5 flex items-center justify-between border-b border-emerald-800">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              NATIONAL AGRICULTURE MARKET (eNAM)
            </div>
            <h3 className="font-extrabold text-lg mt-0.5">{t.book_slot}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-300 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.select_centre}</label>
              <select
                value={selectedCentre}
                onChange={(e) => { setSelectedCentre(e.target.value); setRecommendedSlots([]); }}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-medium bg-white focus:ring-2 focus:ring-emerald-700 text-xs"
              >
                {centres.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.district})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.select_crop}</label>
              <select
                value={selectedCrop}
                onChange={(e) => { setSelectedCrop(e.target.value); setRecommendedSlots([]); }}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-medium bg-white focus:ring-2 focus:ring-emerald-700 text-xs"
              >
                {crops.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — ₹{c.msp_rate}/Q
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.quantity}</label>
              <input
                type="number"
                min="1"
                max="500"
                value={quantity}
                onChange={(e) => { setQuantity(e.target.value); setRecommendedSlots([]); }}
                className="w-full p-2 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{t.preferred_date}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setRecommendedSlots([]); }}
                className="w-full p-2 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-emerald-700 text-xs"
              />
            </div>
          </div>

          {currentCropObj && quantity > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-900">Official Govt. MSP Value:</span>
              <span className="font-black text-emerald-900 text-sm">
                ₹{(quantity * currentCropObj.msp_rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Allocation Action */}
          <button
            type="button"
            onClick={handleFindSmartSlots}
            disabled={loadingSlots}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wide transition flex items-center justify-center gap-2"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{loadingSlots ? "Querying Mandi Capacity..." : t.find_smart_slots}</span>
          </button>

          {/* Recommended Slots List */}
          {recommendedSlots.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                <span>Available Anti-Congestion Windows:</span>
                <span className="text-emerald-800 font-semibold">{recommendedSlots.length} slot(s) available</span>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {recommendedSlots.map((slot) => {
                  const isSelected = selectedSlotId === slot.id;
                  return (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? "border-emerald-700 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-700"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-800" : "text-slate-400"}`} />
                          <span className="font-mono font-black text-sm text-slate-900">
                            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                          {slot.recommended_reason}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10.5px] text-slate-500">
                        <span>Free Capacity: <strong className="text-slate-800">{slot.remaining_capacity} Q</strong></span>
                        <span>Est. Turnaround: <strong className="text-emerald-800">~{slot.expected_wait_minutes} mins</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmBooking}
            disabled={!selectedSlotId || bookingInProgress}
            className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs tracking-wider uppercase transition shadow flex items-center gap-1.5"
          >
            {bookingInProgress ? (
              <span>Issuing Gate Pass...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t.book_now}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
