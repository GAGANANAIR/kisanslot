import React from 'react';
import { Bell, CheckCheck, X, Clock } from 'lucide-react';

export default function NotificationModal({ isOpen, onClose, notifications, onMarkAllRead }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-kisan-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-kisan-200" />
            <h3 className="font-bold text-lg">Notifications & Alerts</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-kisan-600 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="p-3 bg-gray-50 border-b flex justify-between items-center text-xs text-gray-500">
          <span>{notifications.length} message(s)</span>
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-kisan-700 font-semibold hover:underline"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border text-sm transition ${
                  n.is_read
                    ? "bg-white border-gray-100 text-gray-700"
                    : "bg-kisan-50/60 border-kisan-200 text-kisan-950 font-medium"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-white/80 border text-kisan-700">
                    {n.event_type.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(n.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="leading-snug">{n.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
