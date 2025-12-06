import cron from "node-cron";
import { fetchEventsByKeywordAndCountry } from "./ticketmaster.js";
import EventLog from "../models/EventLog.js";
import { broadcastNotification } from "./notifier.js";
import dotenv from "dotenv";

// load .env file
dotenv.config();

const ARTIST_KEYWORD = process.env.ARTIST_KEYWORD;
const COUNTRY_CODE = process.env.COUNTRY_CODE;

// frequency: run every 3 hours
const CRON_SPEC = process.env.POLL_CRON; // every 3 hours at minute 0

export function startEventChecker() {
  console.log("ℹ️  Starting event checker cron:", CRON_SPEC);

  cron.schedule(
    CRON_SPEC,
    async () => {
      console.log(
        "ℹ️ [CRON] Checking Ticketmaster for new events",
        new Date().toISOString
      );
      try {
        await doCheck();
      } catch (e) {
        console.error("❌[CRON] error during check", e?.message ?? e);
      }
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );

  // run on startup
  doCheck().catch((e) => console.error("❌ Initial check failed!", e));
}

async function doCheck() {
  const events = await fetchEventsByKeywordAndCountry(
    ARTIST_KEYWORD,
    COUNTRY_CODE
  );
  if (!events || events.length === 0) {
    console.log("❌ No events returned");
    return { found: 0 };
  }

  let newEvents = [];
  for (const ev of events) {
    const exists = await EventLog.findOne({
      eventId: ev.id,
    });
    if (!exists) {
      console.log("ℹ️  New event found", ev.id, ev.name, ev.date);
      newEvents.push(ev);

      // create EventLog entry (notifiedAt will be set after notifications below)
      await EventLog.create({
        eventId: ev.id,
        eventName: ev.name,
        raw: ev,
      });
    }
  }

  if (newEvents.length === 0) {
    console.log("❌ No new events since last check!");
    return { found: 0 };
  }

  // notify subscribers for each new event
  for (const ev of newEvents) {
    try {
      await broadcastNotification(ev);
      // update notifiedAt
      await EventLog.updateOne(
        { eventId: ev.id },
        { $set: { notifiedAt: new Date() } }
      );
    } catch (e) {
      console.error("❌ Failed to notidy for event", ev.id, e);
    }
  }

  return { found: newEvents.length, events: newEvents.map((e) => e.id) };
}
