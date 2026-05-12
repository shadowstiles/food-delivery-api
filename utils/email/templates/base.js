export const BRAND_COLOR = "#1BAC4B";
export const APP_NAME = "Epe Delivery";

export function buildHtmlOld({
  title,
  bodyHtml,
  buttonText = null,
  buttonUrl = null,
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; background:#f4f6f8; margin:0; padding:20px;}
    .container { max-width:600px; margin: auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
    .header { background:${BRAND_COLOR}; color:#fff; padding:16px; text-align:center; font-weight:700; font-size:18px; }
    .content { padding:20px; color:#222; line-height:1.5; }
    .btn { display:inline-block; padding:12px 18px; background:${BRAND_COLOR}; color:#fff; text-decoration:none; border-radius:6px; font-weight:600; margin-top:12px; }
    .muted { color:#7a7a7a; font-size:13px; margin-top:12px; }
    .footer { padding:14px; text-align:center; font-size:12px; color:#999; }
    @media (max-width:480px) { .content { padding:16px; } .header { font-size:16px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">${APP_NAME}</div>
    <div class="content">
      <h2 style="margin-top:0">${title}</h2>
      ${bodyHtml}
      ${buttonText && buttonUrl ? `<div><a class="btn" href="${buttonUrl}">${buttonText}</a></div>` : ""}
      <div class="muted">If you did not request this, you can ignore this message.</div>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</div>
  </div>
</body>
</html>`;
}

export function buildHtml({
  title,
  bodyHtml,
  buttonText = null,
  buttonUrl = null,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <style>
    /* Base */
    body {
      margin: 0;
      padding: 0;
      background: #f5f7fa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      color: #222222;
    }

    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 3px 12px rgba(0,0,0,0.08);
    }

    .header {
      background: ${BRAND_COLOR};
      padding: 20px;
      text-align: center;
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    .content {
      padding: 26px;
      line-height: 1.6;
      font-size: 16px;
    }

    .btn {
      display: inline-block;
      background: ${BRAND_COLOR};
      color: #ffffff !important;
      padding: 14px 22px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin-top: 18px;
    }

    .muted {
      margin-top: 20px;
      font-size: 13px;
      color: #7a7a7a;
    }

    .footer {
      padding: 18px;
      text-align: center;
      font-size: 12px;
      color: #999999;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .content { padding: 20px; }
      .header { font-size: 18px; }
      .btn { width: 100%; text-align: center; }
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header">${APP_NAME}</div>

    <div class="content">
      <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700;">
        ${title}
      </h2>

      ${bodyHtml}

      ${
        buttonText && buttonUrl
          ? `<a class="btn" href="${buttonUrl}" target="_blank">${buttonText}</a>`
          : ""
      }

      <p class="muted">If you did not request this, please ignore this message.</p>
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

export function buildText({
  title,
  bodyText,
  buttonText = null,
  buttonUrl = null,
}) {
  let txt = `${title}\n\n${bodyText}\n`;
  if (buttonText && buttonUrl) {
    txt += `\n${buttonText}: ${buttonUrl}\n`;
  }
  txt += `\nIf you did not request this, ignore this message.\n\n© ${new Date().getFullYear()} ${APP_NAME}`;
  return txt;
}
