# KisanSlot Production Publishing & Deployment Guide

This guide explains how to publish **KisanSlot** to the web so anyone with a smartphone (farmers) or laptop (mandi operators) can access it securely in real time.

---

## 🚀 Option 1: Free Cloud Deployment (Vercel + Render)

This is the fastest, free method to get a live public `.vercel.app` and `.onrender.com` URL:

### 1. Deploy Backend on [Render.com](https://render.com) (or Railway)
1. Fork or push your `kisanslot` repo to GitHub.
2. Sign in to Render and click **New + > Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt && python -m app.seed`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port 10000`
5. Add Environment Variables:
   - `SECRET_KEY`: `<generate-a-random-32-char-string>`
   - `DATABASE_URL`: `sqlite:///./kisanslot.db` (or a PostgreSQL database URL)
   - `ALLOWED_ORIGINS`: `*`
6. Click **Deploy Web Service**. You will get a URL like `https://kisanslot-backend.onrender.com`.

### 2. Deploy Frontend on [Vercel.com](https://vercel.com) (or Netlify)
1. Sign in to Vercel and click **Add New > Project**.
2. Select your repository.
3. Configure settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
4. Add Environment Variables:
   - `VITE_API_URL`: `https://kisanslot-backend.onrender.com/api/v1`
   - `VITE_WS_URL`: `wss://kisanslot-backend.onrender.com/ws`
5. Click **Deploy**. In under 1 minute, your website will be live at `https://kisanslot.vercel.app`!

---

## 🐳 Option 2: 1-Click Docker Compose Deployment

If deploying to any Cloud Virtual Private Server (AWS EC2, DigitalOcean, Hetzner, Linode, or local server):

```bash
# 1. Clone repository
git clone https://github.com/your-username/kisanslot.git
cd kisanslot

# 2. Build and start all production containers (Backend + Frontend Nginx)
docker compose up -d --build

# 3. Check container status
docker compose ps
```

- Frontend & Nginx reverse proxy runs on **port 80** (`http://<your-server-ip>`).
- Backend API runs on **port 8000** (`http://<your-server-ip>:8000`).
- Health checks automatically ensure the backend is online before opening frontend traffic.

---

## 🛡️ Environment Variables Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `SECRET_KEY` | `super-secret-...` | Secret string for HMAC-SHA256 JWT encryption |
| `DATABASE_URL` | `sqlite:///./kisanslot.db` | Database connection string (SQLite or PostgreSQL) |
| `ALLOWED_ORIGINS` | `*` | Comma-separated list of allowed frontend domains for CORS |
| `NOTIFICATION_PROVIDER` | `mock` | SMS provider (`mock`, `twilio`, or `fast2sms`) |
| `TWILIO_ACCOUNT_SID` | `""` | Twilio Account SID (if using live SMS) |
| `TWILIO_AUTH_TOKEN` | `""` | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | `""` | Twilio virtual phone number |
| `FAST2SMS_API_KEY` | `""` | Fast2SMS Indian SMS Gateway API Key |
