import { buildHtml, buildText } from "./base.js";

// 1. Critical System Alert (e.g., server down, webhook failure)
export function systemAlertTemplate({
  serviceName,
  severity,
  message,
  dashboardUrl,
}) {
  const title = `System Alert — ${serviceName}`;
  const bodyHtml = `<p><strong>Severity:</strong> ${severity}</p>
                    <p>${message}</p>
                    <p>Immediate attention may be required.</p>`;
  const bodyText = `System Alert\nService: ${serviceName}\nSeverity: ${severity}\nMessage: ${message}\nDashboard: ${dashboardUrl}`;
  return {
    subject: `[${severity}] System Alert — ${serviceName}`,
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

// 2. Security Alert (e.g., suspicious login, API abuse)
export function securityAlertTemplate({
  userEmail,
  event,
  ipAddress,
  location,
  manageUrl,
}) {
  const title = "Security alert";
  const bodyHtml = `<p>A security-related event was detected:</p>
                    <ul>
                      <li><strong>User:</strong> ${userEmail}</li>
                      <li><strong>Event:</strong> ${event}</li>
                      <li><strong>IP Address:</strong> ${ipAddress}</li>
                      <li><strong>Location:</strong> ${location}</li>
                    </ul>`;
  const bodyText = `Security alert:\nUser: ${userEmail}\nEvent: ${event}\nIP: ${ipAddress}\nLocation: ${location}\nManage: ${manageUrl}`;
  return {
    subject: `Security alert — ${event}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "Manage Account",
      buttonUrl: manageUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "Manage Account",
      buttonUrl: manageUrl,
    }),
  };
}

// 3. Backup Status (success/failure)
export function backupStatusTemplate({ status, date, details, logsUrl }) {
  const title = `Backup ${status}`;
  const bodyHtml = `<p>The scheduled backup has completed with status: <strong>${status}</strong></p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p>${details}</p>`;
  const bodyText = `Backup ${status}\nDate: ${date}\nDetails: ${details}\nLogs: ${logsUrl}`;
  return {
    subject: `Backup ${status} — ${date}`,
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "View Logs",
      buttonUrl: logsUrl,
    }),
    text: buildText({
      title,
      bodyText,
      buttonText: "View Logs",
      buttonUrl: logsUrl,
    }),
  };
}

// 4. Recovery Notification (when restore is run)
export function recoveryNotificationTemplate({
  date,
  serviceName,
  status,
  details,
  dashboardUrl,
}) {
  const title = "Recovery operation";
  const bodyHtml = `<p>A recovery operation has been executed:</p>
                    <ul>
                      <li><strong>Service:</strong> ${serviceName}</li>
                      <li><strong>Date:</strong> ${date}</li>
                      <li><strong>Status:</strong> ${status}</li>
                    </ul>
                    <p>${details}</p>`;
  const bodyText = `Recovery executed.\nService: ${serviceName}\nDate: ${date}\nStatus: ${status}\nDetails: ${details}\nDashboard: ${dashboardUrl}`;
  return {
    subject: `Recovery operation — ${status}`,
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

// 5. Test/Debug Email (for developers/ops)
export function testEmailTemplate({ message, timestamp }) {
  const title = "Test Email";
  const bodyHtml = `<p>This is a test/debug email from the system.</p>
                    <p><strong>Message:</strong> ${message}</p>
                    <p><strong>Timestamp:</strong> ${timestamp}</p>`;
  const bodyText = `Test Email\nMessage: ${message}\nTimestamp: ${timestamp}`;
  return {
    subject: `Test Email — ${timestamp}`,
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}
