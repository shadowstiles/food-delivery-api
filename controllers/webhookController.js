import Payout from "../models/payoutModel.js";
import Refund from "../models/refundModel.js";
import Transaction from "../models/transactionModel.js";
import catchAsync from "../utils/catchAsync.js";
import { verifyWebhookSignature } from "../utils/gatewayClient.js";

function parseWebhookBody(req) {
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
  return req.body;
}

export const gatewayRefundWebhook = catchAsync(async (req, res, next) => {
  const gateway = req.params.gateway || req.query.gateway || "unknown";

  // ✅ Verify authenticity
  const valid = verifyWebhookSignature(req, gateway);
  if (!valid) {
    return res.status(401).json({ message: "Invalid signature" });
  }

  const event = parseWebhookBody(req);

  // Extract identifiers
  const reference =
    event?.data?.reference || event?.data?.id || event.reference;
  const status = event?.data?.status || event?.status;

  if (!reference) {
    return res.status(400).json({ message: "No reference provided" });
  }

  // Find Refund
  let refund = await Refund.findOne({ reference });
  if (!refund) {
    // fallback: maybe linked to a transaction
    const txn = await Transaction.findOne({ reference });
    if (!txn)
      return res.status(404).json({ message: "Refund/transaction not found" });
    refund = await Refund.findOne({ transaction: txn._id });
  }

  if (!refund) {
    return res.status(404).json({ message: "Refund record not found" });
  }

  // Update refund status
  refund.gatewayResponse = event;
  refund.history.push({
    status,
    changedBy: null, // system auto-update
  });

  if (["success", "processed"].includes(status)) {
    refund.status = "success";
    refund.processedAt = new Date();
  } else if (["failed", "declined"].includes(status)) {
    refund.status = "failed";
  } else if (["chargeback", "dispute"].includes(status)) {
    refund.status = "disputed";
  }

  await refund.save();

  return res.status(200).json({ message: "Webhook received", data: refund });
});

export const handlePayoutWebhook = catchAsync(async (req, res, next) => {
  // 1. Verify signature
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const payload = parseWebhookBody(req);

  // Normalize event
  const event = payload?.event || payload?.status;
  const reference = payload?.data?.reference || payload?.reference;

  // console.log(`Payout webhook received: ${event}, ref=${reference}`);

  // 2. Find matching payout
  const payout = await Payout.findOne({ reference });
  if (!payout) {
    return res.status(404).json({ error: "Payout not found" });
  }

  // 3. Map gateway status → internal status
  let newStatus = "processing";
  if (
    event === "TRANSFER_COMPLETED" ||
    event === "transfer.success" ||
    payload?.status === "success"
  ) {
    newStatus = "success";
  } else if (
    event === "TRANSFER_FAILED" ||
    event === "transfer.failed" ||
    payload?.status === "failed"
  ) {
    newStatus = "failed";
  }

  payout.status = newStatus;
  payout.gatewayResponse = payload;
  payout.processedAt = new Date();
  await payout.save();

  return res.status(200).json({ received: true });
});
