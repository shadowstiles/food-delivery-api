import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../config.env") });

const requiredEnv = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

if (process.env.NODE_ENV === "production") {
  requiredEnv.push("CORS_ORIGINS");
}

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    process.stderr.write(`Missing environment variable: ${key}\n`);

    process.exit(1);
  }
});

export default {
  mongoURI: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_REFRESH_SECRET,
  paystackKey: process.env.PAYSTACK_KEY,
};
