import { setServers } from "node:dns/promises";

import mongoose from "mongoose";

import env from "./env.js";

// Source - https://stackoverflow.com/a/79892633
// Posted by Xoosk
// Retrieved 2026-05-18, License - CC BY-SA 4.0

setServers(["1.1.1.1", "8.8.8.8"]);

const DB = env.mongoURI.replace("<PASSWORD>", process.env.MONGO_DB_PASSWORD);

// ====== MongoDB Connection ======
const connectDB = async () => {
  try {
    await mongoose.connect(DB, {
      dbName: "epeDelivery",
    });
    process.stdout.write("MongoDB connected successfully\n");
  } catch (error) {
    process.stderr.write(`MongoDB connection failed: ${error.message}\n`);
    process.exit(1); // Exit if DB connection fails
  }
};

export default connectDB;
