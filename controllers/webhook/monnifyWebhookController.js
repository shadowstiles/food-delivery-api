import crypto from "crypto";

import { verifyPayment } from "../../services/paymentService.js";

function parseWebhookBody(req) {
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
  return req.body;
}

export default async function monnifyWebhook(req, res) {
  const signature = req.headers["monnify-signature"];
  const rawBody = req.rawBody || req.body;

  const hash = crypto
    .createHmac("sha512", process.env.MONNIFY_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  if (!signature || hash !== signature) {
    return res.sendStatus(400);
  }

  try {
    const event = parseWebhookBody(req);
    const data = event.eventData || {};

    if (
      event.eventType === "SUCCESSFUL_TRANSACTION" &&
      data.paymentStatus === "PAID" &&
      data.paymentReference
    ) {
      await verifyPayment(data.paymentReference, "monnify");
    }

    return res.sendStatus(200);
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}
