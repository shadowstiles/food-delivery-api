import { buildHtml, buildText } from "./base.js";

// format NGN
function fmtNGN(amount) {
  return Number(amount).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
}

// 1. Signup Confirmation
export function vendorSignupTemplate({ vendorName }) {
  const title = "Welcome to Epe Delivery!";
  const bodyHtml = `<p>Hi ${vendorName},</p>
                    <p>Thank you for signing up as a vendor on <strong>Epe Delivery</strong>. 
                    Our team is reviewing your application and you’ll get an update soon.</p>`;
  const bodyText = `Hi ${vendorName}, thank you for signing up as a vendor on Epe Delivery. Our team is reviewing your application and you’ll get an update soon.`;

  return {
    subject: "Application received — Epe Delivery Vendor",
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}

// 2. Account Approved
export function vendorApprovedTemplate({ vendorName, dashboardUrl }) {
  const title = "Your account is live!";
  const bodyHtml = `<p>Hi ${vendorName},</p>
                    <p>Congratulations! Your restaurant is now live on Epe Delivery.</p>`;
  const bodyText = `Hi ${vendorName}, your restaurant is now live on Epe Delivery. Dashboard: ${dashboardUrl}`;

  return {
    subject: "Vendor account approved — Epe Delivery",
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

// 3. Account Rejected / Needs Update
export function vendorRejectedTemplate({ vendorName, reason, dashboardUrl }) {
  const title = "Action required: Update your application";
  const bodyHtml = `<p>Hi ${vendorName},</p>
                    <p>Unfortunately, we couldn’t approve your application.</p>
                    <p><strong>Reason:</strong> ${reason}</p>`;
  const bodyText = `Hi ${vendorName}, unfortunately we couldn’t approve your application. Reason: ${reason}. Update here: ${dashboardUrl}`;
  return {
    subject: "Application update required — Epe Delivery",
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "Update Application",
      buttonUrl: dashboardUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "Update Application",
      buttonUrl: dashboardUrl,
    }),
  };
}

// 4. New Order Notification
export function newOrderTemplate({
  vendorName,
  orderId,
  items,
  total,
  dashboardUrl,
}) {
  const title = `New order received — #${orderId}`;
  const bodyHtml = `<p>Hi ${vendorName},</p>
                    <p>You’ve received a new order:</p>
                    <ul>
                      ${items.map((i) => `<li>${i.name} x${i.qty}</li>`).join("")}
                    </ul>
                    <p><strong>Total:</strong> ${fmtNGN(total)}</p>`;
  const bodyText = `Hi ${vendorName}, new order #${orderId}. Items:\n${items.map((i) => `- ${i.name} x${i.qty}`).join("\n")}\nTotal: ${fmtNGN(total)}\nDashboard: ${dashboardUrl}`;
  return {
    subject: `New order #${orderId} — Epe Delivery`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "View Order",
      buttonUrl: dashboardUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "View Order",
      buttonUrl: dashboardUrl,
    }),
  };
}

// 5. Order Cancelled
export function orderCancelledTemplate({ vendorName, orderId, reason = null }) {
  const title = `Order #${orderId} cancelled`;
  const bodyHtml = `<p>Hi ${vendorName},</p>
                    <p>Order #${orderId} has been cancelled.</p>
                    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}`;
  const bodyText = `Hi ${vendorName}, order #${orderId} cancelled. ${reason ? `Reason: ${reason}` : ""}`;
  return {
    subject: `Order cancelled — #${orderId}`,
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}

// 6. Sales Summary
export function salesSummaryTemplate({
  vendorName,
  period,
  orders,
  revenue,
  topItem,
}) {
  const title = `Sales summary — ${period}`;
  const bodyHtml = `<p>Hi ${vendorName},</p>
                    <p>Here’s your sales summary for <strong>${period}</strong>:</p>
                    <ul>
                      <li>Total Orders: ${orders}</li>
                      <li>Total Revenue: ${fmtNGN(revenue)}</li>
                      <li>Top Item: ${topItem}</li>
                    </ul>`;
  const bodyText = `Hi ${vendorName}, sales summary for ${period}:\nOrders: ${orders}\nRevenue: ${fmtNGN(revenue)}\nTop Item: ${topItem}`;
  return {
    subject: `Sales summary — ${period}`,
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}

// 7. Payout Confirmation
export function payoutConfirmationTemplate({
  vendorName,
  amount,
  last4,
  txnRef,
}) {
  const title = "Payout confirmation";
  const bodyHtml = `<p>Hi ${vendorName},</p>
                    <p>A payout of <strong>${fmtNGN(amount)}</strong> has been sent to your account ending in ${last4}.</p>
                    <p>Transaction Ref: ${txnRef}</p>`;
  const bodyText = `Hi ${vendorName}, payout of ${fmtNGN(amount)} sent to account ending in ${last4}. Ref: ${txnRef}`;
  return {
    subject: `Payout sent — ₦${amount}`,
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}
