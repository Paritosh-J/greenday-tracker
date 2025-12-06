import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false,
    index: true,
    unique: true,
  },
  pushSubscription: {
    type: Object,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// compound unique to avoid duplicate email+push
SubscriptionSchema.index({ email: 1 }, { unique: false });

export default mongoose.model("Subscription", SubscriptionSchema);
