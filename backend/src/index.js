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

// --- ADD: Temporary debug route to check the server & route reachability
app.get("/__debug/ping", (req, res) => {
  return res.json({ ok: true, time: new Date().toISOString(), msg: "ping" });
});

// routes
app.use("/api/subscriptions", subscriptionRoutes);

// --- ADD: Optionally mount a simple test subscribe that always returns 200 (temporary)
app.post("/__debug/test-subscribe", (req, res) => {
  console.log("[DEBUG] test-subscribe body:", req.body);
  return res.json({
    ok: true,
    note: "test-subscribe reached",
    body: req.body || null,
  });
});

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

// get all routes list
function listRoutes() {
  try {
    const routePaths = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        // routes registered directly on the app
        const methods = Object.keys(middleware.route.methods).join(",");
        routePaths.push(`${methods.toUpperCase()} ${middleware.route.path}`);
      } else if (
        middleware.name === "router" &&
        middleware.handle &&
        middleware.handle.stack
      ) {
        // router middleware
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).join(",");
            routePaths.push(`${methods.toUpperCase()} ${handler.route.path}`);
          }
        });
      }
    });
    console.log("=== Registered routes ===");
    routePaths.forEach((r) => console.log(r));
    console.log("=========================");
  } catch (err) {
    console.error("Failed to list routes", err);
  }
}

// connect to database
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
      listRoutes(); // print the mounted routes to logs
      startEventChecker(); // start scheduled polling
    });
  })
  .catch((er) => {
    console.error("❌ Failed to connect to DB", er);
    process.exit(1);
  });

// parse errors & return JSON instead of HTML
app.use((err, req, res, next) => {
  // Handle invalid JSON (SyntaxError thrown by express.json)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("❌ Invalid JSON received:", err);
    return res.status(400).json({ error: "Invalid JSON" });
  }
  // Generic handler
  console.error("❌ Unhandled error:", err);
  return res
    .status(500)
    .json({ error: err?.message || "Internal Server Error" });
});

// 404 fallback (also return JSON)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});
