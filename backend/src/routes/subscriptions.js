import express from "express";
import Subscription from "../models/Subscription.js";
import {
  getVapidPublicKey,
  sendSubscriptionConfirmation,
} from "../services/notifier.js";

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

    let doc = null;

    // If pushSubscription provided, check both endpoints and emails for existing subscriptions
    if (pushSubscription) {
      const endpoint = pushSubscription.endpoint;

      // Find any existing docs by endpoint and by email (if provided)
      const [docByEndpoint, docByEmail] = await Promise.all([
        Subscription.findOne({ "pushSubscription.endpoint": endpoint }),
        email ? Subscription.findOne({ email }) : null,
      ]);

      if (docByEndpoint && docByEmail) {
        // Both exist
        if (docByEndpoint._id.equals(docByEmail._id)) {
          // same document: update it
          docByEndpoint.pushSubscription = pushSubscription;

          if (email) docByEndpoint.email = email;
          await docByEndpoint.save();
          doc = docByEndpoint;
        } else {
          // Different documents: merge them.
          // Strategy: keep docByEmail as canonical (to preserve unique email),
          // attach pushSubscription to it, remove the endpoint-only doc.
          docByEmail.pushSubscription = pushSubscription;
          await docByEmail.save();
          await Subscription.deleteOne({ _id: docByEndpoint._id });
          doc = await Subscription.findById(docByEmail._id);
        }
      } else if (docByEndpoint) {
        // Endpoint exists, update email if needed
        if (email && docByEndpoint.email !== email) {
          // If email exists elsewhere we'd have handled above; safe to update here
          docByEndpoint.email = email;
        }
        docByEndpoint.pushSubscription = pushSubscription;
        await docByEndpoint.save();
        doc = docByEndpoint;
      } else if (docByEmail) {
        // Email exists but endpoint not present: attach pushSubscription to the email doc
        docByEmail.pushSubscription = pushSubscription;
        await docByEmail.save();
        doc = docByEmail;
      } else {
        // Neither exists: create new document (email optional)
        doc = await Subscription.create({
          ...(email ? { email } : {}),
          pushSubscription,
        });
      }
    } else {
      // pushSubscription not provided => simple email upsert
      doc = await Subscription.findOneAndUpdate(
        { email },
        { email },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // send confirmation email
    if (email) {
      sendSubscriptionConfirmation(email).catch((er) => {
        console.error("❌ Failed to send subscription confirmation", er);
      });
    }

    // Always include vapidPublicKey in the response for convenience (frontend uses it)
    return res.json({
      ok: true,
      subscription: doc,
      vapidPublicKey: getVapidPublicKey(),
    });
  } catch (err) {
    // If still a duplicate key, surface a clear message
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ error: "Duplicate key - conflicting email or endpoint" });
    }
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
