import dotenv from "dotenv";
import Mailjet from "node-mailjet";
import webpush from "web-push";
import Subscription from "../models/Subscription.js";

// load .env file
dotenv.config();

const MJ_API_KEY = process.env.MAILJET_API_KEY;
const MJ_API_SECRET = process.env.MAILJET_API_SECRET;
const MAIL_FROM = process.env.MAIL_FROM_EMAIL;
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME;
if (!MJ_API_KEY || !MJ_API_SECRET) {
  console.warn("⚠️ Mailjet keys not set - emails disabled");
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn("⚠️ VAPID keys not set - web-push disabled");
}

let mailjet;
if (MJ_API_KEY && MJ_API_SECRET) {
  mailjet = Mailjet.connect(MJ_API_KEY, MJ_API_SECRET);
}

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${MAIL_FROM_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

// send email to user
export async function sendEmail(toEmail, subject, htmlContent, textContent) {
  if (!mailjet) {
    console.warn("⚠️ Mailjet missing - can't send email!");
    return;
  }

  try {
    const request = mailjet
      .post("send", {
        version: "v3.1",
      })
      .request({
        Messages: [
          {
            From: {
              Email: MAIL_FROM,
              Name: MAIL_FROM_NAME,
            },
            To: [{ Email: toEmail }],
            Subject: subject,
            TextPart: textContent,
            HTMLPart: htmlContent,
          },
        ],
      });

    const res = await request;

    return res.body;
  } catch (e) {
    console.error("❌ mail send error", e);
    throw e;
  }
}

// send push notification
export async function sendWebPush(subscription, payload) {
  if (!VAPID_PRIVATE_KEY) {
    console.warn("⚠️ VAPID not set - skip web push");
    return;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (e) {
    console.error("❌ web-push error", e);
    throw e;
  }
}

// broadcast notification & email to all subscribers
export async function broadcastNotification(
  event,
  opts = {
    skipEmails: false,
  }
) {
  const subs = await Subscription.find({});
  const subject = `Green Dat ${event.name} - ${event.venue.city ?? ""}, ${
    event.date
  }`;
  const baseUrl = process.env.BACKEND_BASE_URL;
  const eventLink = event.url ?? baseUrl;
  const html = `
    <h3>Green Day: ${event.name}</h3>
    <p><strong>Date:</strong> ${event.date}</p>
    <p><strong>Venue:</strong> ${event.venue.name ?? ""}, ${
    event.venue.city ?? ""
  }</p>
    <p><a href="${eventLink}">View on Ticketing site</a></p>
  `;
  const text = `Green Day: ${event.name} - ${event.date} at ${
    event.venue?.name ?? ""
  }, ${event.venue?.city ?? ""}. ${eventLink}`;

  await Promise.all(
    subs.map(async (s) => {
      // email
      if (!opts.skipEmails && s.email) {
        try {
          await sendEmail(s.email, subject, html, text);
          console.log("✅ email sent!");
        } catch (e) {
          console.error("❌ Failed to send email to", s.email, e?.message ?? e);
        }
      }

      // web push
      if (s.pushSubscription) {
        try {
          await sendWebPush(s.pushSubscription, {
            title: "💚Green Day is coming to India!💚",
            body: `${event.name} — ${event.date} at ${event.venue?.name ?? ""}`,
            url: eventLink,
          });
          console.log("✅ web-push sent!");
        } catch (e) {
          // invalid push subscription - remove it
          console.error(
            "❌ Push failed, removing subscription",
            e?.statusCode ?? e
          );
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            await Subscription.deleteOne({
              _id: s._id,
            });
          }
        }
      }
    })
  );

  return { notifiedCount: subs.length };
}
