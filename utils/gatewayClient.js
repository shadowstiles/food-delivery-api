import crypto from "crypto";

import axios from "axios";

/**
 * Verify webhook signature for different gateways
 * @param {Object} req - Express request object
 * @param {string} gateway - Optional: "monnify" | "flutterwave"
 * @returns {boolean} true if signature is valid
 */
export function verifyWebhookSignature(req, gateway) {
  // 1️⃣ Auto-detect gateway if not provided
  const gw = gateway || process.env.PAYMENT_GATEWAY;

  if (!gw) return false;

  if (gw === "monnify") {
    // Paystack expects HMAC SHA512 of raw body
    const signature = req.headers["x-paystack-signature"];
    if (!signature) return false;

    // Use rawBody if middleware set it; fallback to stringified body
    const body = req.rawBody || JSON.stringify(req.body);
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(body)
      .digest("hex");

    return signature === hash;
  }

  if (gw === "flutterwave") {
    // Flutterwave expects verif-hash header
    const signature =
      req.headers["verif-hash"] || req.headers["x-flutterwave-signature"];
    if (!signature) return false;

    return signature === process.env.FLW_SECRET_HASH;
  }

  // Extendable for other gateways in future
  return false;
}

export async function initiateTransfer({
  reference,
  amount,
  method,
  bankDetails,
}) {
  if (method === "monnify") {
    const res = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount: amount * 100, // kobo
        recipient: bankDetails.recipientCode,
        reason: `Payout ${reference}`,
      },
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    return {
      success: res.data.status,
      providerId: res.data.data.id,
      rawResponse: res.data,
      error: res.data.message || null,
    };
  }

  if (method === "flutterwave") {
    const res = await axios.post(
      "https://api.flutterwave.com/v3/transfers",
      {
        account_bank: bankDetails.bankCode,
        account_number: bankDetails.accountNumber,
        amount,
        narration: `Payout ${reference}`,
        currency: "NGN",
        reference,
      },
      { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } }
    );

    return {
      success: res.data.status === "success",
      providerId: res.data.data.id,
      rawResponse: res.data,
      error: res.data.message || null,
    };
  }

  throw new Error("Unsupported payout method");
}

export async function refundPayment(
  transactionId,
  { gateway, reference, amount, refundReference }
) {
  if (gateway === "monnify") {
    const res = await axios.post(
      "https://api.paystack.co/refund",
      {
        transaction: transactionId || reference,
        amount: amount ? Math.round(Number(amount) * 100) : undefined,
        vendor_note: refundReference,
      },
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    return {
      success: res.data.status,
      providerId: res.data.data?.id,
      rawResponse: res.data,
      error: res.data.message || null,
    };
  }

  if (gateway === "flutterwave") {
    const res = await axios.post(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/refund`,
      {
        amount,
        comments: refundReference,
      },
      { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } }
    );

    return {
      success: res.data.status === "success",
      providerId: res.data.data?.id,
      rawResponse: res.data,
      error: res.data.message || null,
    };
  }

  throw new Error("Unsupported refund gateway");
}

export default initiateTransfer;
