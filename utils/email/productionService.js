import AppError from "../appError.js";

const MAX_RETRIES = 3;
const BACKOFF_MS = 800;

const isProd = process.env.NODE_ENV === "production";

const API_KEY = process.env.BREVO_API_KEY;

const FROM = process.env.MAIL_FROM || {
  name: "Epe Delivery",
  email: "noreply@epedeliver.com.ng",
};

//
// ENV VALIDATION (non-blocking in dev)
//
if (isProd) {
  const required = ["BREVO_API_KEY"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new AppError(`Missing email config: ${missing.join(", ")}`, 500);
  }
}

//
// CORE SEND FUNCTION (Brevo HTTP API)
//
async function sendMail({ to, subject, html, text }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": API_KEY,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender:
        typeof FROM === "string"
          ? { name: "Epe Delivery", email: "noreply@epedeliver.com.ng" }
          : FROM,

      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || JSON.stringify(data));
  }

  return data;
}

//
// MAIN EMAIL SERVICE (keeps your retry logic)
//
export default async function sendEmail({ to, subject, html, text }) {
  let lastError;

  // eslint-disable-next-line no-plusplus
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await sendMail({ to, subject, html, text });
      return true;
    } catch (err) {
      lastError = err;

      console.error(`Email attempt ${attempt} failed:`, {
        message: err.message,
      });

      if (attempt === MAX_RETRIES) break;

      const delay = BACKOFF_MS * 2 ** attempt;

      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => {
        setTimeout(r, delay);
      });
    }
  }

  throw new AppError(
    lastError?.message || "Email service temporarily unavailable",
    500
  );
}
