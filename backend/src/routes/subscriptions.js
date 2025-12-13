import express from "express";
import Subscription from "../models/Subscription.js";
import { getVapidPublicKey } from "../services/notifier.js";

const router = express.Router();

// POST /api/subscriptions/subscribe
// body: {email?: string, pushSubscription?: object}
// accepts either email only, push only, or both.
router.post("/subscribe", async (req, res) => {
  try {
    console.log("ℹ️  [INFO] /api/subscriptions/subscribe body:", req.body);
    const { email, pushSubscription } = req.body || {};

    if (!email && !pushSubscription) {
      return res
        .status(400)
        .json({ error: "email or pushSubscription required" });
    }

    let doc;
    if (pushSubscription) {
      // upsert by push endpoint (prefer push endpoint as unique)
      doc = await Subscription.findOneAndUpdate(
        { "pushSubscription.endpoint": pushSubscription.endpoint },
        { pushSubscription, ...(email ? { email } : {}) },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      // email-only upsert
      doc = await Subscription.findOneAndUpdate(
        { email },
        { email },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Always include vapidPublicKey in the response for convenience (frontend uses it)
    return res.json({
      ok: true,
      subscription: doc,
      vapidPublicKey: getVapidPublicKey(),
    });
  } catch (err) {
    console.error("subscribe error", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
});

// POST /api/subscriptions/unsubscribe
// body: { email?: string, endpoint?: string }
router.post("/unsubscribe", async (req, res) => {
  try {
    const { email, endpoint } = req.body;

    if (!email && !endpoint)
      return res.status(400).json({ error: "email or endpoint required" });

    if (endpoint) {
      await Subscription.deleteOne({ "pushSubscription.endpoint": endpoint });
    }
    if (email) {
      await Subscription.deleteOne({ email });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ unsubscribe error", e);
    return res.status(500).json({ error: e.message });
  }
});

// (optional) list subscriptions
router.get("/", async (req, res) => {
  const subs = await Subscription.find({}).limit(200).lean();
  res.json({ count: subs.length, subs });
});

export default router;
