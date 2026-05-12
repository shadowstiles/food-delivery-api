import { buildHtml, buildText } from "./base.js";

// helper: format currency (NGN)
function fmtNGN(amount) {
  // keep simple server-side formatting (no locale issues)
  return Number(amount).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
}

// Helper: render items table for HTML
function renderItemsHtml(items = []) {
  if (!items.length) return "<p>No items.</p>";
  const rows = items
    .map(
      (it) => `
    <tr>
      <td style="padding:8px 4px;">${it.product.name}</td>
      <td style="padding:8px 4px; text-align:right;">${it.quantity}</td>
      <td style="padding:8px 4px; text-align:right;">${fmtNGN(it.price)}</td>
    </tr>
  `
    )
    .join("");
  return `
    <table width="100%" style="border-collapse:collapse;margin-top:12px;">
      <thead>
        <tr>
          <th align="left">Item</th>
          <th align="right">Qty</th>
          <th align="right">Unit Price</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// 1. Order Placed
export function orderPlacedTemplate({
  orderId,
  items,
  subtotal,
  deliveryFee,
  total,
  eta,
  trackUrl,
}) {
  const title = `Order #${orderId} received`;
  const summaryHtml = `
    <p>Thanks — we received your order. We'll confirm with the restaurant shortly.</p>
    ${renderItemsHtml(items)}
    <p style="margin-top:12px">Subtotal: <strong>${fmtNGN(subtotal)}</strong><br/>
       Delivery: <strong>${fmtNGN(deliveryFee)}</strong><br/>
       <strong>Total: ${fmtNGN(total)}</strong></p>
    <p>Estimated delivery: <strong>${eta}</strong></p>
  `;
  const bodyText = `Order #${orderId} received.\nTotal: ${fmtNGN(total)}\nEstimated delivery: ${eta}\nTrack: ${trackUrl || "open app"}`;
  return {
    subject: `Order #${orderId} received — Epe Delivery`,
    html: buildHtml({
      title,
      bodyHtml: summaryHtml,
      buttonText: trackUrl ? "Track Order" : null,
      buttonUrl: trackUrl || null,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: trackUrl ? "Track Order" : null,
      buttonUrl: trackUrl || null,
    }),
  };
}

// 2. Payment Successful
export function paymentSuccessTemplate({ orderId, amount, receiptUrl }) {
  const title = "Payment successful";
  const bodyHtml = `<p>We received your payment of <strong>${fmtNGN(amount)}</strong> for Order #${orderId}.</p>`;
  const bodyText = `Payment received: ${fmtNGN(amount)} for Order #${orderId}. Receipt: ${receiptUrl || "open app"}`;
  return {
    subject: `Payment successful — Order #${orderId}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: receiptUrl ? "View Receipt" : null,
      buttonUrl: receiptUrl || null,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: receiptUrl ? "View Receipt" : null,
      buttonUrl: receiptUrl || null,
    }),
  };
}

// 3. Payment Failed
export function paymentFailedTemplate({
  orderId,
  amount,
  retryUrl,
  reason = null,
}) {
  const title = "Payment failed";
  const bodyHtml = `<p>We couldn't process your payment of <strong>${fmtNGN(amount)}</strong> for Order #${orderId}.</p>
                    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
                    <p>Please retry payment to avoid order cancellation.</p>`;
  const bodyText = `Payment failed for Order #${orderId} (${fmtNGN(amount)}). Reason: ${reason || "unknown"}. Retry: ${retryUrl || "open app"}`;
  return {
    subject: `Payment failed — Order #${orderId}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: retryUrl ? "Retry Payment" : null,
      buttonUrl: retryUrl || null,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: retryUrl ? "Retry Payment" : null,
      buttonUrl: retryUrl || null,
    }),
  };
}

// 4. Refund Processed
export function refundProcessedTemplate({ orderId, amount, reason = null }) {
  const title = "Refund processed";
  const bodyHtml = `<p>A refund of <strong>${fmtNGN(amount)}</strong> for Order #${orderId} has been processed.</p>
                    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}`;
  const bodyText = `Refund of ${fmtNGN(amount)} for Order #${orderId} processed. ${reason ? `Reason: ${reason}.` : ""}`;
  return {
    subject: `Refund processed — Order #${orderId}`,
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}

// 5. Order Status Update (generic)
export function orderStatusUpdateTemplate({
  orderId,
  status,
  comment = null,
  trackUrl = null,
}) {
  const title = `Order #${orderId} — ${status}`;
  const bodyHtml = `<p>Your order <strong>#${orderId}</strong> status is now: <strong>${status}</strong>.</p>
                    ${comment ? `<p>${comment}</p>` : ""}`;
  const bodyText = `Order #${orderId} status: ${status}. ${comment || ""}`;
  return {
    subject: `Order #${orderId} update — ${status}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: trackUrl ? "Track Delivery" : null,
      buttonUrl: trackUrl || null,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: trackUrl ? "Track Delivery" : null,
      buttonUrl: trackUrl || null,
    }),
  };
}

// 6. Delivery Assigned (rider details + track)
export function deliveryAssignedTemplate({
  orderId,
  riderName,
  riderPhone,
  riderPhotoUrl = null,
  trackUrl = null,
}) {
  const title = "Delivery assigned";
  const bodyHtml = `<p>Your order <strong>#${orderId}</strong> has been assigned to a rider.</p>
                    <p><strong>Rider:</strong> ${riderName}<br/><strong>Phone:</strong> ${riderPhone}</p>
                    ${riderPhotoUrl ? `<p><img src="${riderPhotoUrl}" alt="rider" style="width:80px;height:80px;border-radius:8px"/></p>` : ""}`;
  const bodyText = `Order #${orderId} assigned to ${riderName} (${riderPhone}). Track: ${trackUrl || "open app"}`;
  return {
    subject: `Rider assigned — Order #${orderId}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: trackUrl ? "Track Rider" : null,
      buttonUrl: trackUrl || null,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: trackUrl ? "Track Rider" : null,
      buttonUrl: trackUrl || null,
    }),
  };
}

// 7. Delivery Update (e.g., rider nearby, picked up)
export function deliveryUpdateTemplate({
  orderId,
  updateText,
  eta = null,
  trackUrl = null,
}) {
  const title = "Delivery update";
  const bodyHtml = `<p>Update for Order <strong>#${orderId}</strong>:</p><p>${updateText}</p>
                    ${eta ? `<p>New ETA: <strong>${eta}</strong></p>` : ""}`;
  const bodyText = `Order #${orderId} update: ${updateText} ${eta ? `New ETA: ${eta}` : ""}`;
  return {
    subject: `Delivery update — Order #${orderId}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: trackUrl ? "Track Delivery" : null,
      buttonUrl: trackUrl || null,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: trackUrl ? "Track Delivery" : null,
      buttonUrl: trackUrl || null,
    }),
  };
}

// 8. Order Cancelled
export function orderCancelledTemplate({
  orderId,
  reason = null,
  refundAmount = null,
}) {
  const title = "Order cancelled";
  const bodyHtml = `<p>Your order <strong>#${orderId}</strong> was cancelled.${reason ? `<br/><strong>Reason:</strong> ${reason}` : ""}</p>
                    ${refundAmount ? `<p>Refund: <strong>${fmtNGN(refundAmount)}</strong> (if applicable).</p>` : ""}`;
  const bodyText = `Order #${orderId} cancelled. ${reason ? `Reason: ${reason}.` : ""} Refund: ${refundAmount ? fmtNGN(refundAmount) : "N/A"}.`;
  return {
    subject: `Order #${orderId} cancelled`,
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}

// 9. Promotions / Discounts
export function promoTemplate({
  titleLine,
  body,
  promoCode,
  expiry,
  ctaUrl = null,
}) {
  const title = titleLine || "Special offer for you";
  const bodyHtml = `<p>${body}</p><p><strong>Promo code:</strong> ${promoCode} (valid until ${expiry})</p>`;
  const bodyText = `${body}\nPromo: ${promoCode} (valid until ${expiry})`;
  return {
    subject: `${titleLine} — Epe Delivery`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: ctaUrl ? "Use Promo" : null,
      buttonUrl: ctaUrl || null,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: ctaUrl ? "Use Promo" : null,
      buttonUrl: ctaUrl || null,
    }),
  };
}
