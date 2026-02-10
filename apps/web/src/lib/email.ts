interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
}

const MAX_RETRIES = 3;

function isRetryable(status: number): boolean {
  return status >= 500 || status === 429;
}

export async function sendEmail(
  { to, subject, html, idempotencyKey }: SendEmailOptions,
  apiKey: string,
) {
  if (!apiKey || apiKey === "placeholder") {
    console.log("\n┌──────────────────────────────────────────");
    console.log("│ EMAIL (console mode — no RESEND_API_KEY)");
    console.log("├──────────────────────────────────────────");
    console.log(`│ To:      ${to}`);
    console.log(`│ Subject: ${subject}`);
    console.log("│ HTML:    (below)");
    console.log("├──────────────────────────────────────────");
    console.log(html);
    console.log("└──────────────────────────────────────────\n");
    return { id: "console-dev-mode" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const body = JSON.stringify({
    from: "SKVault <hello@mail.skvault.dev>",
    reply_to: "SKVault Support <support@skvault.dev>",
    to,
    subject,
    html,
  });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body,
    });

    if (response.ok) {
      return response.json();
    }

    if (!isRetryable(response.status) || attempt === MAX_RETRIES - 1) {
      const errorBody = await response.text();
      throw new Error(`Resend API error (${response.status}): ${errorBody}`);
    }

    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    await new Promise((r) => setTimeout(r, delay + Math.random() * 1000));
  }
}

// --- Email templates ---

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.5; color: #1a1a1a; background-color: #f5f5f5; }
  .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 8px; padding: 32px; }
  .btn { display: inline-block; padding: 14px 28px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 13px; color: #737373; }
</style>
</head>
<body>
<div class="container">
${content}
</div>
</body>
</html>`;
}

export function verificationEmailHtml(url: string): string {
  return emailWrapper(`
  <h2 style="margin-top:0;">Verify your email</h2>
  <p>Welcome to SKVault! Click the button below to verify your email address and activate your account.</p>
  <p style="text-align:center; margin: 28px 0;">
    <a href="${url}" class="btn">Verify Email</a>
  </p>
  <p style="font-size:13px; color:#737373;">If the button doesn't work, copy and paste this link into your browser:</p>
  <p style="font-size:13px; word-break:break-all; color:#737373;">${url}</p>
  <div class="footer">
    <p>If you didn't create a SKVault account, you can safely ignore this email.</p>
  </div>`);
}

export function resetPasswordEmailHtml(url: string): string {
  return emailWrapper(`
  <h2 style="margin-top:0;">Reset your password</h2>
  <p>We received a request to reset the password for your SKVault account. Click the button below to choose a new password.</p>
  <p style="text-align:center; margin: 28px 0;">
    <a href="${url}" class="btn">Reset Password</a>
  </p>
  <p style="font-size:13px; color:#737373;">This link expires in 1 hour. If the button doesn't work, copy and paste this link:</p>
  <p style="font-size:13px; word-break:break-all; color:#737373;">${url}</p>
  <div class="footer">
    <p>If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
  </div>`);
}
