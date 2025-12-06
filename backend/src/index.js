import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import { startEventChecker, manualCheck } from "./services/eventChecker.js";

// load .env file
dotenv.config();

const PORT = process.env.PORT || 8000;

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => res.send("✅ GreenDay Tracker backend up"));

// routes
app.use("api/subscriptions", subscriptionRoutes);

// health check
app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    time: new Date(),
  })
);
// manual trigger check
app.post("/api/trigger-check", async (req, res) => {
  try {
    const result = await manualCheck();
    res.json({
      triggered: true,
      result,
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});

// connect to database
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
      startEventChecker(); // start scheduled polling
    });
  })
  .catch((er) => {
    console.error("❌ Failed to connect to DB", er);
    process.exit(1);
  });
