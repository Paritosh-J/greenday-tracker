import mongoose from "mongoose";

const EventLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
  },
  eventName: String,
  announcedAt: {
    type: Date,
    default: Date.now,
  },
  notifiedAt: {
    trpe: Date,
    default: Date.now,
  },
  raw: {
    type: Object,
  },
});

export default mongoose.model("EventLog", EventLogSchema);
