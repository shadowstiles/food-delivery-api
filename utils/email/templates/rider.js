import { buildHtml, buildText } from "./base.js";

// format NGN
function fmtNGN(amount) {
  return Number(amount).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
}

export function riderPendingApprovalTemplate({ riderName, dashboardUrl }) {
  const title = "Your Application is Under Review";

  const bodyHtml = `
    <p>Hi ${riderName},</p>
    <p>Thank you for signing up to become a rider with <strong>Epe Delivery</strong>.</p>
    <p>Your account has been created successfully and is currently <strong>awaiting approval</strong> from our team.</p>
    <p>We are reviewing your submitted documents. Once your account is approved, you will receive another email and can start accepting deliveries.</p>
    <p>If you have not completed your profile or uploaded all required documents, please do so from your dashboard.</p>
  `;

  const bodyText = `
Hi ${riderName},

Your rider account has been created successfully and is currently awaiting approval.

Our team is reviewing your submitted documents. Once approved, you will receive another notification and can begin accepting deliveries.

If you still need to upload required documents, please visit your dashboard:
${dashboardUrl}
  `;

  return {
    subject: "Your Epe Delivery Rider Application is Under Review",
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "Open Dashboard",
      buttonUrl: dashboardUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "Open Dashboard",
      buttonUrl: dashboardUrl,
    }),
  };
}

// 1. Welcome / Account Approved
export function riderWelcomeTemplate({ riderName, dashboardUrl }) {
  const title = "Welcome to Epe Delivery!";
  const bodyHtml = `<p>Hi ${riderName},</p>
                    <p>Your rider account has been approved. You can now start accepting deliveries and earning money.</p>`;
  const bodyText = `Hi ${riderName}, your rider account has been approved. Start accepting deliveries: ${dashboardUrl}`;
  return {
    subject: "Welcome aboard — Epe Delivery Rider",
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "Open Dashboard",
      buttonUrl: dashboardUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "Open Dashboard",
      buttonUrl: dashboardUrl,
    }),
  };
}

// 2. New Delivery Assigned
export function newDeliveryAssignedTemplate({
  orderId,
  pickupAddress,
  dropoffAddress,
  amount,
  acceptUrl,
}) {
  const title = "New delivery request";
  const bodyHtml = `<p>A new delivery has been assigned:</p>
                    <p><strong>Order:</strong> #${orderId}</p>
                    <p><strong>Pickup:</strong> ${pickupAddress}<br/>
                       <strong>Dropoff:</strong> ${dropoffAddress}</p>
                    <p>Delivery fee: <strong>${fmtNGN(amount)}</strong></p>`;
  const bodyText = `New delivery assigned. Order #${orderId}\nPickup: ${pickupAddress}\nDropoff: ${dropoffAddress}\nFee: ${fmtNGN(amount)}\nAccept: ${acceptUrl}`;
  return {
    subject: `New delivery request — Order #${orderId}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "Accept Delivery",
      buttonUrl: acceptUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "Accept Delivery",
      buttonUrl: acceptUrl,
    }),
  };
}

// 3. Delivery Cancelled
export function deliveryCancelledTemplate({ orderId, reason = null }) {
  const title = "Delivery cancelled";
  const bodyHtml = `<p>The delivery for Order #${orderId} has been cancelled.</p>
                    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}`;
  const bodyText = `Delivery for Order #${orderId} cancelled. ${reason ? `Reason: ${reason}` : ""}`;

  return {
    subject: `Delivery cancelled — Order #${orderId}`,
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}

// 4. Payment Settlement (weekly/monthly)
export function payoutTemplate({
  riderName,
  period,
  deliveriesCount,
  totalAmount,
  breakdownUrl = null,
}) {
  const title = "Payout summary";
  const bodyHtml = `<p>Hi ${riderName},</p>
                    <p>Your payout for <strong>${period}</strong> has been processed.</p>
                    <p><strong>Deliveries completed:</strong> ${deliveriesCount}<br/>
                       <strong>Total payout:</strong> ${fmtNGN(totalAmount)}</p>`;
  const bodyText = `Hi ${riderName}, your payout for ${period} is ${fmtNGN(totalAmount)} (${deliveriesCount} deliveries). See breakdown: ${breakdownUrl || "dashboard"}`;
  return {
    subject: `Payout processed — ${period}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: breakdownUrl ? "View Breakdown" : null,
      buttonUrl: breakdownUrl || null,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: breakdownUrl ? "View Breakdown" : null,
      buttonUrl: breakdownUrl || null,
    }),
  };
}

// 5. Performance Report (optional, monthly/quarterly)
export function performanceReportTemplate({
  riderName,
  period,
  rating,
  deliveriesCount,
  earnings,
}) {
  const title = "Performance report";
  const bodyHtml = `<p>Hi ${riderName},</p>
                    <p>Here’s your performance summary for <strong>${period}</strong>:</p>
                    <ul>
                      <li>Deliveries completed: ${deliveriesCount}</li>
                      <li>Average rating: ${rating}/5</li>
                      <li>Total earnings: ${fmtNGN(earnings)}</li>
                    </ul>
                    <p>Keep up the great work!</p>`;
  const bodyText = `Hi ${riderName}, performance for ${period}:\nDeliveries: ${deliveriesCount}\nRating: ${rating}/5\nEarnings: ${fmtNGN(earnings)}`;
  return {
    subject: `Your performance report — ${period}`,
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}
