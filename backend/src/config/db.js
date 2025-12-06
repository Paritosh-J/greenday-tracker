import mongoose from "mongoose";
import dotenv from "dotenv";

// load .env file
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

export default async function connectDB() {
  if (!MONGO_URI) throw new Error("MONGO_URI not set in .env ❌");

  mongoose.set("strictQuery", false);

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("Connected to MongoDB ✅");
}
