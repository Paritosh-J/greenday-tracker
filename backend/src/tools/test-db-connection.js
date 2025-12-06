import dotenv from "dotenv";
import mongoose from "mongoose";

// load .env file
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function test() {
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI missing in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB successfully!");

    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    const info = await admin.serverStatus();
    console.log("ℹ️  Server info version:", info.version);
    await mongoose.disconnect();

    process.exit(0);
  } catch (err) {
    console.error("❌ Connection failed:", err);
    process.exit(1);
  }
}

test();
