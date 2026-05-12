/* eslint-disable import/order */
import connectDB from "./config/db.js";
import app from "./app.js";

process.on("uncaughtException", (err) => {
  process.stderr.write("UNCAUGHT EXCEPTION. Shutting down...\n");
  process.stderr.write(`${err.stack || err.message}\n`);

  process.exit(1);
});

connectDB();

const port = process.env.PORT || 3000;
const server = app.listen(port, "0.0.0.0", () => {
  process.stdout.write(`Listening to port ${port}\n`);
});

process.on("unhandledRejection", (err) => {
  process.stderr.write("UNHANDLED REJECTION. Shutting down...\n");
  process.stderr.write(`${err.name}: ${err.message}\n`);

  server.close(() => {
    process.exit(1);
  });
});
