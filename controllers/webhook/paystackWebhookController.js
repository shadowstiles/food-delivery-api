import crypto from "crypto";

import { verifyPayment } from "../../services/paymentService.js";

function parseWebhookBody(req) {
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
  return req.body;
}

export default async function paystackWebhook(req, res) {
  const signature = req.headers["x-paystack-signature"];
  const rawBody = req.rawBody || req.body;

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  if (!signature || signature !== hash) {
    return res.sendStatus(400);
  }

  try {
    const event = parseWebhookBody(req);

    if (event.event === "charge.success" && event.data?.reference) {
      await verifyPayment(event.data.reference, "monnify");
    }

    return res.sendStatus(200);
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}
