import { useState } from "react";
import {
  urlBase64ToUint8Array,
  registerServiceWorker,
} from "./utils/pushUtils";

const ENV_VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function App() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Simple helper to parse JSON safely and show content on error
  async function safeJson(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { _raw: text };
    }
  }

  // Subscribe with email only
  async function subscribeEmailOnly(e) {
    e.preventDefault();
    setStatus("ℹ️ Saving your email...");

    if (!email || email.trim() === "") {
      setStatus("❌ Please enter an email address before subscribing.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/subscriptions/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || "Subscribe failed");

      setStatus("✅ Subscribed for email alerts!");
      setConfirmation("ℹ️ Confirmation sent to " + email);
      console.log("✅ Subscribed for email alerts");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to subscribe: " + (err.message || err));
    }
  }

  // Subscribe with push notifications
  async function enablePushAndSubscribe(e) {
    e.preventDefault();
    setIsSubscribing(true);
    setStatus("ℹ️ Starting push subscription flow...");

    try {
      // Step 0: ask for Notifications permission (must be 'granted')
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(
          "❌ Notification permission denied — cannot subscribe to push."
        );
        setIsSubscribing(false);
        return;
      }

      // Step 1: Get VAPID public key
      // If VITE_VAPID_PUBLIC_KEY is set at build time, use it (preferred).
      // Else if user provided email, call POST /subscribe with email (server returns vapidPublicKey).
      // Else fail (no way to create push subscription).
      let vapidPublicKey = ENV_VAPID;
      if (!vapidPublicKey) {
        // fallback: need email to fetch vapid key via server
        if (!email || email.trim() === "") {
          throw new Error(
            "No VAPID public key available. Provide an email or set VITE_VAPID_PUBLIC_KEY in the frontend."
          );
        }

        setStatus("ℹ️  Registering email to get VAPID key...");
        const r = await fetch(`${API_BASE}/api/subscriptions/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const j = await safeJson(r);
        if (!r.ok)
          throw new Error(
            j.error || "Failed to register email and fetch VAPID key"
          );
        vapidPublicKey = j.vapidPublicKey;
      }

      if (!vapidPublicKey) throw new Error("VAPID key missing");

      // Step 2: register service worker and wait until it's active
      setStatus("ℹ️ Registering service worker...");
      const registration = await registerServiceWorker("/sw.js");
      // registration is returned when SW is active

      // Step 3: ensure the registration is ready (defensive)
      await navigator.serviceWorker.ready;

      // Step 4: check existing subscription
      setStatus("ℹ️  Subscribing to push manager...");
      let pushSub = await registration.pushManager.getSubscription();
      if (!pushSub) {
        // Subscribe using VAPID public key
        pushSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } else {
        console.log("ℹ️  Existing push subscription found", pushSub);
      }

      // Step 5: send push subscription to server
      setStatus("ℹ️ Saving push subscription on server...");
      const r2 = await fetch(`${API_BASE}/api/subscriptions/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(email ? { email } : {}),
          pushSubscription: pushSub,
        }),
      });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error || "Push subscribe save failed");

      email && email.trim() !== ""
        ? setStatus("✅ Subscribed to push & email alerts!")
        : setStatus("✅ Subscribed to push notifications!");
      email && email.trim() !== ""
        ? console.log("✅ Subscribed to push & email alerts")
        : console.log("✅ Subscribed to push notifications");
    } catch (err) {
      console.error(err);
      setStatus("❌ Push subscription failed: " + (err.message || err));
    } finally {
      setIsSubscribing(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">GreenDay Tour Tracker</h1>
        <p className="description">
          Enter your email to get notified when Green Day announces shows in
          India.
          <br /> Or leave blank for push-only subscription
        </p>

        <form onSubmit={subscribeEmailOnly} className="form">
          <label className="label">Email address</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />

          <div className="actions">
            <button className="btn btn-primary" type="submit">
              Subscribe (email)
            </button>

            <button
              className="btn btn-secondary"
              onClick={enablePushAndSubscribe}
              type="button"
              disabled={isSubscribing}
            >
              {isSubscribing ? "Subscribing..." : "Enable Push Notification"}
            </button>
          </div>
        </form>

        <div className="status">{status}</div>
        <div className="status">{confirmation}</div>

        <hr className="divider" />
        <small className="note">
          Note: For push notifications you will be asked by the browser for
          permission. Make sure you allow notifications and that this site is
          served over HTTPS in production.
        </small>
      </div>
    </div>
  );
}
