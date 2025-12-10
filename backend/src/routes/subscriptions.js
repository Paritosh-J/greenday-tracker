import express from "express";
import Subscription from "../models/Subscription.js";
import { getVapidPublicKey } from "../services/notifier.js";

const router = express.Router();

// POST /api/subscription/subscribe
// body: {email?: string, pushSubscription?: object}
router.post("/subscribe", async (req, res) => {
  try {
    console.log('🪲[DEBUG] /api/subscription/subscribe body:', req.body);
    const { email, pushSubscription } = req.body;
    if (!email && !pushSubscription) {
      return res.status(400).json({
        error: "email or pushSubscription required",
      });
    }

    // if same push subscription exists, update
    let doc;
    if (pushSubscription) {
      doc = await Subscription.findOneAndUpdate(
        {
          "pushSubscription.endpoint": pushSubscription.endpoint,
        },
        { pushSubscription, email },
        { upsert: true, new: true }
      );
    } else {
      // only email
      doc = await Subscription.findOneAndUpdate(
        { email },
        { email },
        { upsert: true, new: true }
      );
    }

    return res.json({
      ok: true,
      subscription: doc,
      vapidPublicKey: getVapidPublicKey(),
    });
  } catch (e) {
    console.error("❌ subscribe error", e);
    return res.status(500).json({ error: e.message });
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
