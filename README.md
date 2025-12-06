# GreenDay Tracker

> 🎸 Never miss **Green Day in India** again — lightweight plug-and-play tracker that watches official tour announcements and notifies users by email and browser push.

---

## 🔥 Project Summary

- **What it does:** Polls an events API (Ticketmaster Discovery API by default) for official Green Day tour dates and notifies registered users when a show is announced in **India**.
- **Who it's for:** Fans who want a zero-friction notifier (email + optional browser push) that alerts them when Green Day comes to India.
- **Primary goals:** Low friction signup (no login), real-time-ish alerts (scheduled polling), and simple deployment on free tiers.

---

## ⭐ Core Features

- ✅ Subscribe with **email** (no verification required)
- ✅ Optional **Web Push** (browser notifications) via Service Worker and VAPID keys
- ✅ Polls Ticketmaster Discovery API for official events filtered by artist keyword and country
- ✅ Stores subscriptions and event logs to avoid duplicate notifications
- ✅ Cron-based scheduler to check for new events and broadcast alerts
- ✅ Minimal, mobile-first frontend (Vite + React) for quick signup

---

## 🏗️ Architecture Overview

- **Frontend (static SPA):** Vite + React; registers a Service Worker at root (`/sw.js`) and handles push subscription flows.
- **Backend (API):** Node.js (ES modules) + Express; handles subscriptions, stores push/email contacts, queries Ticketmaster, and triggers notifications.
- **Database:** MongoDB (Atlas free tier recommended) — stores `Subscription` documents and `EventLog` entries.
- **Email provider:** Mailjet (free tier available) — used for sending event alert emails.
- **Push notifications:** `web-push` (VAPID) to send browser notifications to stored push endpoints.
- **Scheduler:** `node-cron` for persistent servers, or external schedulers (GitHub Actions / cron-job.org) when using serverless.

---

## 🧰 Tech Stack

- **Frontend:** Vite, React (ES modules)
- **Backend:** Node.js (ES modules), Express
- **Database:** MongoDB (Atlas) or Deta Base (alternative)
- **Scheduling:** node-cron (or external scheduler for serverless)
- **Push:** web-push (VAPID)
- **Email:** Mailjet (node-mailjet)
- **Event source:** Ticketmaster Discovery API

---

## 🔗 Public API Endpoints (Backend)

> All endpoints are prefixed with `/api`

- `POST /api/subscriptions/subscribe`
  - Purpose: Add or update a subscriber
  - Request body: JSON with one or both of:
    - `email` (string) — subscriber email
    - `pushSubscription` (object) — browser PushSubscription JSON
  - Response: `{ ok: true, subscription: {...}, vapidPublicKey?: '...' }`
  - Notes: When called with only `{ email }` the server returns the VAPID public key (so the frontend can perform push subscription).

- `POST /api/subscriptions/unsubscribe`
  - Purpose: Remove a subscriber by email or push endpoint
  - Request body: `{ email?: string, endpoint?: string }`

- `POST /api/trigger-check`
  - Purpose: Manually trigger an immediate poll of the events API and notification broadcast (useful for testing).

- `GET /api/health`
  - Purpose: Basic health check returning service status and timestamp.

- (Optional) `GET /api/subscriptions` — admin-only: list subscribers (use with caution in production).

---

## ⚙️ Environment Variables (Essential)

> Place these in a backend `.env` (do NOT commit) and set equivalents in your hosting provider.

- `PORT` — server port (e.g., `8080`)
- `BASE_URL` — public backend URL used for links in emails (optional)
- `MONGO_URI` — MongoDB connection string (Atlas recommended)
- `TM_API_KEY` — Ticketmaster Discovery API key
- `MAILJET_API_KEY` — Mailjet API key (for sending emails)
- `MAILJET_API_SECRET` — Mailjet API secret
- `MAIL_FROM_EMAIL` — From email used in alerts (set domain with proper SPF/DKIM)
- `MAIL_FROM_NAME` — Display name for emails
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — generated VAPID keys for web push

---

## 🔐 Security & Privacy Considerations

- Add rate limiting (e.g., express-rate-limit) and optional CAPTCHA on `subscribe` to prevent abuse.
- Store only the minimal data required: email and push subscription object.
- Provide an easy unsubscribe mechanism (endpoint + email links) to comply with user expectations and regulations.
- Use HTTPS in production and secure environment variables.
- Consider verification or double opt-in in future if spam/sign-up abuse becomes a problem.

---

## ⚠️ Limitations & Known Caveats

- Ticketmaster coverage varies by region — not all official events might be present. Consider supporting additional APIs or artist IDs for higher reliability.
- Keyword-based searching may yield false positives/negatives. Using an artist identifier (if available) is more robust.
- No email verification by design — this trades lower friction for potential typos/spam in subscriber list.
- Free tiers of Mailjet and Ticketmaster have quotas and rate limits — monitor usage.

---

## ✨ Future Improvements (Roadmap)

- Add **SMS** alerts (Twilio / MSG91) — requires paid tier for scale.
- Admin dashboard: view & manage subscribers, event logs, and notification history.
- Better artist matching using official artist IDs and multi-source aggregation (Songkick, Bandsintown) where feasible.
- Add user preferences (notify only for specific cities, venue capacity, or ticket price range).
- Implement double opt-in and unsubscribe links in emails for compliance.

---

## 📦 What's included in the repository (map)

- `backend/` — Node.js sources (Express, services, models, cron job)
- `frontend/` — Vite React SPA (public `sw.js`, `App.jsx`, utility files)
- `docs/` — README and deployment notes

---

> ❤️ Built with rock-and-roll energy — see you at the next Green Day show! 🇮🇳🎸
