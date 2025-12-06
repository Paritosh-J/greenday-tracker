import dotenv from "dotenv";
import mongoose from "mongoose";
import Subscription from "../models/Subscription.js";
import EventLog from "../models/EventLog.js";

// load .env file
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  if (!MONGO_URI) throw new Error("❌ MONGO_URI not set");

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // clear small collections
  await Subscription.deleteMany({});
  await EventLog.deleteMany({});

  // create sample email subscription
  const sub = await Subscription.create({
    email: "paritoshj2002@gmail.com",
    pushSubscription: null,
  });

  const log = await EventLog.create({
    eventId: "test-event-1",
    eventName: "Green Day — Test Event",
    announcedAt: new Date(),
    notifiedAt: null,
    raw: { sample: true },
  });

  console.log("ℹ️  Seeded:", {
    subscriptionId: sub._id.toString(),
    eventLogId: log._id.toString(),
  });

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed", err);
  process.exit(1);
});
