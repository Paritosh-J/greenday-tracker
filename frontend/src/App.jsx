import { useState } from "react";
import {
  urlBase64ToUint8Array,
  registerServiceWorker,
} from "./utils/pushUtils";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function App() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  async function subscribeEmailOnly(e) {
    e.preventDefault();
    setStatus("ℹ️ Saving your email...");

    try {
      const res = await fetch(`${API_BASE}/api/subscriptions/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Subscribe failed");

      setStatus("✅ Subscribed for email alerts");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to subscribe: " + (err.message || err));
    }
  }

  async function enablePushAndSubscribe(e) {
    e.preventDefault();
    setIsSubscribing(true);
    setStatus("ℹ️ Starting push subscription flow...");
    
    try {
      // Step 1: create/ensure email entry and get VAPID key
      const r1 = await fetch(`${API_BASE}/api/subscriptions/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1.error || "Initial subscribe failed");
      const vapidPublicKey = j1.vapidPublicKey;
      if (!vapidPublicKey) throw new Error("No VAPID key returned from server");

      setStatus("ℹ️ Registering service worker...");
      const reg = await registerServiceWorker("/sw.js");

      setStatus("ℹ️ Subscribing push manager...");
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setStatus("ℹ️ Saving push subscription on server...");
      const r2 = await fetch(`${API_BASE}/api/subscriptions/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pushSubscription: subscription }),
      });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error || "Push subscribe save failed");

      setStatus("✅ Subscribed to push & email alerts");
    } catch (err) {
      console.error(err);
      setStatus("❌ Push subscription failed: " + (err.message || err));
    } finally {
      setIsSubscribing(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "4rem auto", padding: "1rem" }}>
      <h1>GreenDay Tour Tracker</h1>
      <p>
        Enter your email to get notified when Green Day announces shows in
        India.
      </p>

      <form onSubmit={subscribeEmailOnly} style={{ marginTop: "1rem" }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          style={{ width: "100%", padding: "0.6rem", fontSize: "1rem" }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="submit" style={{ padding: "0.6rem 1rem" }}>
            Subscribe (email)
          </button>

          <button
            onClick={enablePushAndSubscribe}
            type="button"
            disabled={isSubscribing}
            style={{ padding: "0.6rem 1rem" }}
          >
            Enable Push & Subscribe
          </button>
        </div>
      </form>

      <div style={{ marginTop: 18, color: "#444" }}>{status}</div>

      <hr style={{ margin: "24px 0" }} />
      <small>
        Note: For push notifications you will be asked by the browser for
        permission. Make sure you allow notifications and that this site is
        served over HTTPS in production.
      </small>
    </div>
  );
}
