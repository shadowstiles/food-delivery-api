import mongoose from "mongoose";

import env from "./env.js";

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
