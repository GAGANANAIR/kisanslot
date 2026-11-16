import React from 'react';
import { X, Printer, CheckCircle, Shield, Calendar, Clock, MapPin, Truck, AlertCircle } from 'lucide-react';

export default function GatePassModal({ booking, onClose }) {
  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 text-slate-800 my-6">
        {/* Printable Pass Container */}
        <div id="printable-gate-pass" className="p-6 bg-white space-y-5">
          {/* Official Pass Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                GOVERNMENT OF INDIA • APMC e-PROCUREMENT
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                OFFICIAL MANDI e-GATE PASS
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                National Agriculture Market (eNAM) Validated Entry Ticket
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 print:hidden transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Code & Security Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                GATE PASS IDENTIFIER
              </span>
              <span className="font-mono font-black text-lg text-slate-900 tracking-wider">
                {booking.booking_code}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                DAILY SERIAL TOKEN
              </span>
              <span className="font-mono font-black text-lg text-emerald-700">
                {booking.token_number ? `#${booking.token_number}` : "ISSUED AT GATE"}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <span className="text-slate-400 block text-[11px] font-medium">Farmer Name:</span>
              <strong className="text-slate-900 font-bold text-sm block mt-0.5">{booking.farmer_name}</strong>
              <span className="text-[11px] text-slate-500 font-mono">Ph: {booking.farmer_phone}</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <span className="text-slate-400 block text-[11px] font-medium">Procurement Centre:</span>
              <strong className="text-slate-900 font-bold text-sm block mt-0.5">{booking.centre_name}</strong>
              <span className="text-[11px] text-slate-500">APMC Principal Yard</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <span className="text-slate-400 block text-[11px] font-medium">Notified Crop Lot:</span>
              <strong className="text-emerald-800 font-bold text-sm block mt-0.5">{booking.crop_name}</strong>
              <span className="text-[11px] text-slate-500">Declared: {booking.estimated_quantity_quintals} Quintals</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <span className="text-slate-400 block text-[11px] font-medium">Assigned Arrival Slot:</span>
              <strong className="text-slate-900 font-bold text-sm block mt-0.5">{booking.slot_date}</strong>
              <span className="text-[11px] font-semibold text-emerald-700 font-mono">{booking.slot_time_window}</span>
            </div>
          </div>

          {/* Mandi Rules Note */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
              <span>Instructions for Mandi Gate Inward:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-amber-800">
              <li>Arrive 15 minutes before your time window with this pass on your mobile.</li>
              <li>Moisture must be tested within standard tolerance (&lt;12%) prior to weighment.</li>
              <li>Payment settlement will be credited directly to your Aadhaar-linked DBT bank account.</li>
            </ul>
          </div>

          {/* Footer with Verification Stamp */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              <span>Generated on: {new Date(booking.created_at).toLocaleString()}</span>
              <div className="font-mono text-[10px]">AUTH-DIGISIGN-VERIFIED</div>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-700 block">KisanSlot System</span>
              <span className="text-[10px]">Ministry of Agriculture</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Official Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
