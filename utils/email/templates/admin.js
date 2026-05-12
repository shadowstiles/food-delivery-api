import { buildHtml, buildText } from "./base.js";

// format NGN
function fmtNGN(amount) {
  return Number(amount).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
}

// 1. Signup Confirmation
export function adminSignupTemplate({ adminName, role }) {
  const title = "Welcome to Epe Delivery!";
  const bodyHtml = `<p>Hi ${adminName},</p>
                    <p>You have been assigned an admin role of ${role} in <strong>Epe Delivery</strong>. 
                    We are happy that you will be joining Our team and you’ll get your responsibilities soon.</p>`;
  const bodyText = `Hi ${adminName}, You have been assigned an admin role of ${role} in Epe Delivery. We are happy that you will be joining Our team and you’ll get your responsibilities soon.`;

  return {
    subject: "Account created — Epe Delivery Admin",
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}

// 1. New Vendor Signup Request
export function newVendorSignupTemplate({ vendorName, email, reviewUrl }) {
  const title = "New vendor signup request";
  const bodyHtml = `<p>A new vendor has requested to join Epe Delivery:</p>
                    <ul>
                      <li><strong>Name:</strong> ${vendorName}</li>
                      <li><strong>Email:</strong> ${email}</li>
                    </ul>
                    <p>Please review and approve/reject in the admin dashboard.</p>`;
  const bodyText = `New vendor signup request.\nName: ${vendorName}\nEmail: ${email}\nReview: ${reviewUrl}`;
  return {
    subject: `Vendor signup request — ${vendorName}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "Review Request",
      buttonUrl: reviewUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "Review Request",
      buttonUrl: reviewUrl,
    }),
  };
}

// 2. New Rider Application
export function newRiderApplicationTemplate({ riderName, phone, reviewUrl }) {
  const title = "New rider application";
  const bodyHtml = `<p>A new rider has applied to join Epe Delivery:</p>
                    <ul>
                      <li><strong>Name:</strong> ${riderName}</li>
                      <li><strong>Phone:</strong> ${phone}</li>
                    </ul>
                    <p>Please review and approve/reject in the admin dashboard.</p>`;
  const bodyText = `New rider application.\nName: ${riderName}\nPhone: ${phone}\nReview: ${reviewUrl}`;
  return {
    subject: `Rider application — ${riderName}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "Review Application",
      buttonUrl: reviewUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "Review Application",
      buttonUrl: reviewUrl,
    }),
  };
}

// 3. Escalated Issue Report
export function issueEscalatedTemplate({
  issueId,
  orderId,
  description,
  manageUrl,
}) {
  const title = "Issue escalated";
  const bodyHtml = `<p>An issue has been escalated for admin attention:</p>
                    <ul>
                      <li><strong>Issue ID:</strong> ${issueId}</li>
                      <li><strong>Order:</strong> #${orderId}</li>
                    </ul>
                    <p>${description}</p>`;
  const bodyText = `Issue escalated.\nIssue ID: ${issueId}\nOrder: #${orderId}\nDescription: ${description}\nManage: ${manageUrl}`;
  return {
    subject: `Escalated issue — #${issueId}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "Manage Issue",
      buttonUrl: manageUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "Manage Issue",
      buttonUrl: manageUrl,
    }),
  };
}

// 4. Daily/Weekly Business Report
export function businessReportTemplate({
  period,
  totalOrders,
  totalRevenue,
  newUsers,
  reportUrl,
}) {
  const title = `Business report — ${period}`;
  const bodyHtml = `<p>Here’s the summary for <strong>${period}</strong>:</p>
                    <ul>
                      <li>Total orders: ${totalOrders}</li>
                      <li>Total revenue: ${fmtNGN(totalRevenue)}</li>
                      <li>New users: ${newUsers}</li>
                    </ul>`;
  const bodyText = `Business report for ${period}.\nOrders: ${totalOrders}\nRevenue: ${fmtNGN(totalRevenue)}\nNew users: ${newUsers}\nFull report: ${reportUrl}`;
  return {
    subject: `Business report — ${period}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "View Report",
      buttonUrl: reportUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "View Report",
      buttonUrl: reportUrl,
    }),
  };
}

// 5. Payment Settlement Alert
export function settlementAlertTemplate({
  vendorName,
  totalAmount,
  period,
  settlementUrl,
}) {
  const title = "Payment settlement processed";
  const bodyHtml = `<p>A vendor settlement has been processed:</p>
                    <ul>
                      <li><strong>Vendor:</strong> ${vendorName}</li>
                      <li><strong>Period:</strong> ${period}</li>
                      <li><strong>Amount:</strong> ${fmtNGN(totalAmount)}</li>
                    </ul>`;
  const bodyText = `Settlement processed.\nVendor: ${vendorName}\nPeriod: ${period}\nAmount: ${fmtNGN(totalAmount)}\nDetails: ${settlementUrl}`;

  return {
    subject: `Settlement alert — ${vendorName}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "View Settlement",
      buttonUrl: settlementUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "View Settlement",
      buttonUrl: settlementUrl,
    }),
  };
}
