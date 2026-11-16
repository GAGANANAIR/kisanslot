// Production API & WebSocket Client with resilient auto-reconnect
const isProd = import.meta.env.PROD;
const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";
const WS_BASE = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000/ws";

export function getAuthHeaders() {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || "API Request Failed");
  }
  return res.json();
}

export const api = {
  // Health
  checkHealth: () => request("/health"),

  // Auth
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/auth/me"),
  updateLang: (lang) => request("/auth/language", { method: "PATCH", body: JSON.stringify({ language_pref: lang }) }),

  // Centres & Crops
  getCentres: () => request("/centres"),
  getCrops: () => request("/crops"),

  // Slots & Allocation
  getAvailableSlots: (centreId, date) => request(`/slots/available?centre_id=${centreId}${date ? `&slot_date=${date}` : ""}`),
  recommendSlots: (centreId, cropId, quantity, date) =>
    request(`/slots/recommend?centre_id=${centreId}&crop_id=${cropId}&quantity_quintals=${quantity}${date ? `&slot_date=${date}` : ""}`),

  // Bookings
  createBooking: (data) => request("/bookings", { method: "POST", body: JSON.stringify(data) }),
  getMyBookings: () => request("/bookings/my-bookings"),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: "POST" }),
  rescheduleBooking: (id, newSlotId) => request(`/bookings/${id}/reschedule`, { method: "POST", body: JSON.stringify({ new_slot_id: newSlotId }) }),

  // Queue Operations
  getTodayQueue: (centreId, filter) => request(`/queue/today?centre_id=${centreId}${filter ? `&status_filter=${filter}` : ""}`),
  checkInFarmer: (id) => request(`/queue/${id}/check-in`, { method: "POST" }),
  callFarmer: (id, counterNumber) => request(`/queue/${id}/call?counter_number=${counterNumber}`, { method: "POST" }),
  getLiveQueueStatus: (bookingId) => request(`/queue/status/${bookingId}`),

  // Procurement & Payments
  recordProcurement: (data) => request("/procurement/record", { method: "POST", body: JSON.stringify(data) }),
  getFarmerPayments: () => request("/payments/farmer"),
  getAllPayments: () => request("/payments/all"),
  markPaymentPaid: (id, data) => request(`/payments/${id}/mark-paid`, { method: "POST", body: JSON.stringify(data) }),

  // Analytics
  getAnalyticsDashboard: () => request("/analytics/dashboard"),

  // Notifications
  getMyNotifications: () => request("/notifications/my"),
  markNotificationsRead: (ids) => request("/notifications/mark-read", { method: "POST", body: JSON.stringify({ notification_ids: ids || [] }) })
};

/**
 * Resilient Production WebSocket with Exponential Backoff Auto-Reconnect
 * Essential for mobile farmers on fluctuating 4G/5G/rural networks.
 */
export function createWebSocket(path, onMessage, onError, onStatusChange) {
  let ws = null;
  let isClosedManually = false;
  let reconnectAttempts = 0;
  const maxDelay = 10000;

  function connect() {
    if (isClosedManually) return;
    const fullUrl = `${WS_BASE}${path}`;
    
    try {
      ws = new WebSocket(fullUrl);

      ws.onopen = () => {
        reconnectAttempts = 0;
        if (onStatusChange) onStatusChange(true);
        console.log(`[WS] Connected to: ${path}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error("[WS] Message parsing error:", e);
        }
      };

      ws.onerror = (err) => {
        if (onError) onError(err);
      };

      ws.onclose = () => {
        if (onStatusChange) onStatusChange(false);
        if (!isClosedManually) {
          // Exponential backoff reconnect
          const delay = Math.min(maxDelay, 1000 * Math.pow(1.5, reconnectAttempts));
          reconnectAttempts++;
          console.log(`[WS] Connection lost. Reconnecting in ${Math.round(delay)}ms...`);
          setTimeout(connect, delay);
        }
      };
    } catch (e) {
      console.error("[WS] Setup error:", e);
    }
  }

  connect();

  return {
    send: (msg) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    },
    close: () => {
      isClosedManually = true;
      if (ws) ws.close();
    }
  };
}
