import { verifyPayment } from "../../services/paymentService.js";

function parseWebhookBody(req) {
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
  return req.body;
}

export default async function flutterwaveWebhook(req, res) {
  const signature = req.headers["verif-hash"];

  if (!process.env.FLW_SECRET_HASH || signature !== process.env.FLW_SECRET_HASH) {
    return res.sendStatus(400);
  }

  try {
    const event = parseWebhookBody(req);

    if (
      event.event === "charge.completed" &&
      event.data?.status === "successful" &&
      event.data?.tx_ref
    ) {
      await verifyPayment(event.data.tx_ref, "flutterwave");
    }

    return res.sendStatus(200);
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}
