import { buildHtml, buildText } from "./base.js";

export function accountVerificationTemplate({ code }) {
  const title = "Verify your Epe Delivery account";
  const bodyHtml = `
    <p>Welcome to Epe Delivery — please verify your account.</p>
    <p style="font-size:20px; font-weight:700">${code}</p>
    <p>This code expires in 10 minutes.</p>
  `;
  const bodyText = `Welcome to Epe Delivery. Your verification code is: ${code}. It expires in 10 minutes.`;

  return {
    subject: "Verify your Epe Delivery account",
    html: buildHtml({ title, bodyHtml }),
    text: buildText({
      title,
      bodyText,
    }),
  };
}

export function accountVerificationLinkTemplate({ url }) {
  const title = "Verify your Epe Delivery account";

  const bodyHtml = `
    <p>You have been added to the Epe Delivery platform.</p>
    <p>To activate your account and set a new password, please click the button below:</p>
  `;

  const bodyText = `
    You have been added to Epe Delivery.
    To activate your account and set a new password, open this link:
    ${url}
  `.trim();

  return {
    subject: "Verify your Epe Delivery account",
    html: buildHtml({
      title,
      bodyHtml,
      buttonText: "Verify Account",
      buttonUrl: url,
    }),
    text: buildText({
      title,
      bodyText,
    }),
  };
}

export function loginOtpTemplate({ code }) {
  const title = "Your login code";
  const bodyHtml = `<p>Use the one-time code below to continue logging in to your account.</p><p style="font-size:22px; font-weight:700">${code}</p><p>Code expires in 5 minutes.</p>`;
  const bodyText = `Your login code: ${code} (expires in 5 minutes).`;

  return {
    subject: "Your Epe Delivery login code",
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}

export function passcodeResetTemplate({ code }) {
  const title = "Reset your passcode";
  const bodyHtml = `<p>We received a request to reset your passcode. Use the code below to set a new passcode.</p><p style="font-size:22px; font-weight:700">${code}</p><p>This code is valid for 10 mins.</p>`;
  const bodyText = `Your Passcode reset code is: ${code} (valid for 10 mins).`;
  return {
    subject: "Reset your Epe Delivery passcode",
    html: buildHtml({
      title,
      bodyHtml,
    }),
    text: buildText({
      title,
      bodyText,
    }),
  };
}

export function pinResetTemplate({ code }) {
  const title = "PIN reset code";
  const bodyHtml = `<p>Use the code below to reset your payment PIN.</p><p style="font-size:20px;font-weight:700">${code}</p><p>Expires in 10 minutes.</p>`;
  const bodyText = `Your PIN reset code: ${code} (expires in 10 minutes).`;

  return {
    subject: "Epe Delivery PIN reset code",
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}

export function securityAlertTemplate({ when, locationDescription }) {
  const title = "New sign-in to your account";
  const bodyHtml = `<p>We detected a sign-in to your account at <strong>${when}</strong> from <strong>${locationDescription}</strong>.</p><p>If this was you, no action is needed. If not, please reset your passcode immediately.</p>`;
  const bodyText = `We detected a sign-in at ${when} from ${locationDescription}. If this wasn't you, reset your passcode immediately.`;

  return {
    subject: "Security alert: new sign-in",
    html: buildHtml({ title, bodyHtml }),
    text: buildText({ title, bodyText }),
  };
}
