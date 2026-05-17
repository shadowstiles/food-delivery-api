import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";

import AppError from "../appError.js";

const MAX_RETRIES = 3;
const BACKOFF_MS = 500; // base

const isProd = process.env.NODE_ENV === "production";
const FROM = process.env.MAIL_FROM || "Epe Delivery <no-reply@epedelivery.com>";

if (isProd) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new AppError("SENDGRID_API_KEY required in production", 400);
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendViaSendGrid({ to, subject, html, text }) {
  const msg = { to, from: FROM, subject, html, text };
  return sgMail.send(msg);
}

async function sendViaSMTP({ to, subject, html, text }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter.sendMail({ from: FROM, to, subject, html, text });
}

async function sendDevEthereal({ to, subject, html, text }) {
  // const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
    text,
  });
  // Preview URL in console
  console.log("Ethereal preview URL:", nodemailer.getTestMessageUrl(info));
  return info;
}

/* eslint-disable no-await-in-loop */
export default async function sendEmail({ to, subject, html, text }) {
  let attempt = 0;
  let lastError = null;

  while (attempt < MAX_RETRIES) {
    try {
      if (isProd) {
        try {
          // try SendGrid first
          await sendViaSendGrid({ to, subject, html, text });
        } catch (sgErr) {
          // fallback to SMTP if configured
          if (process.env.SMTP_HOST) {
            await sendViaSMTP({ to, subject, html, text });
          } else throw sgErr;
        }
      } else {
        // dev: ethereal
        await sendDevEthereal({ to, subject, html, text });
      }
      // success
      return true;
    } catch (err) {
      lastError = err;
      attempt += 1;
      const delay = BACKOFF_MS * 2 ** attempt;

      // For testing
      // console.warn(
      //   `Email send attempt ${attempt} failed. retrying in ${delay}ms`
      // );

      await new Promise((r) => {
        setTimeout(r, delay);
      });
    }
  }

  // // for testing
  // console.error("All email send attempts failed:", lastError);

  throw lastError;
}
