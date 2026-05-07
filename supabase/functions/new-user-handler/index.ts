import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const SHEETS_APPEND_URL = (id: string, range: string) => `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}:append?valueInputOption=USER_ENTERED`;
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

serve(async (req) => {
  try {
    const { record, type } = await req.json();

    // Only process new inserts
    if (type !== 'INSERT') {
      return new Response(JSON.stringify({ message: "Not an insertion" }), { status: 200 });
    }

    const { id: uid, email, display_name } = record;
    const username = display_name || email.split('@')[0];
    const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    console.log(`[NewUser] Processing: ${email} (${uid})`);

    // 1. Send Welcome & Admin Emails via Gmail API
    await handleEmails(email, uid, username);

    // 2. Log to Google Sheets
    await logToSheet(email, uid, username, dateStr);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("[Error]", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

async function handleEmails(userEmail: string, uid: string, username: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  const adminEmail = Deno.env.get("ADMIN_EMAIL");

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("Gmail credentials missing");
    return;
  }

  // Refresh Access Token
  const tokenRes = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const { access_token } = await tokenRes.json();

  const welcomeBody = getEmailTemplate("welcome", { username });
  const adminBody = getEmailTemplate("admin", { email: userEmail, uid });

  await Promise.all([
    sendGmail(access_token, userEmail, "Welcome to the Command Center", welcomeBody),
    adminEmail ? sendGmail(access_token, adminEmail, `[Alert] New User: ${userEmail}`, adminBody) : Promise.resolve(),
  ]);
}

async function sendGmail(token: string, to: string, subject: string, html: string) {
  const raw = btoa(
    `Content-Type: text/html; charset=utf-8\r\nMIME-Version: 1.0\r\nTo: ${to}\r\nSubject: ${subject}\r\n\r\n${html}`
  ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  
  if (!res.ok) console.error(`Failed to send email to ${to}:`, await res.text());
}

async function logToSheet(email: string, uid: string, username: string, date: string) {
  const sheetId = Deno.env.get("SPREADSHEET_ID");
  const clientEmail = Deno.env.get("GOOGLE_SHEETS_CLIENT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_SHEETS_PRIVATE_KEY")?.replace(/\\n/g, '\n');

  if (!sheetId || !clientEmail || !privateKey) {
    console.warn("Sheets credentials missing");
    return;
  }

  // Create JWT for Google Sheets
  const jwt = await new jose.SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(await jose.importPKCS8(privateKey, "RS256"));

  // Exchange JWT for Access Token
  const tokenRes = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const { access_token } = await tokenRes.json();

  // Append Row
  const res = await fetch(SHEETS_APPEND_URL(sheetId, "Sheet1!A:D"), {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      values: [[username, uid, email, date]],
    }),
  });

  if (!res.ok) console.error("Failed to log to Sheet:", await res.text());
}

function getEmailTemplate(type: "welcome" | "admin", data: any) {
  if (type === "welcome") {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ServX</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; width: 100% !important; background-color: #050505; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .cta-button:hover { background-color: #00e6b8 !important; box-shadow: 0 0 15px rgba(0, 255, 204, 0.5); }
    </style>
</head>
<body style="background-color: #050505; color: #e0e0e0; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #050505; padding: 40px 10px;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #111111; border: 1px solid #222222; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
                    <tr>
                        <td align="center" style="padding: 40px 30px 20px 30px; border-bottom: 1px solid #222;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 2px;">
                                <span style="color: #00FFCC;">[</span> ServX <span style="color: #00FFCC;">]</span>
                            </h1>
                            <p style="color: #888888; font-size: 14px; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px;">Infrastructure Command Center</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px 20px 30px;">
                            <h2 style="margin: 0 0 15px 0; color: #ffffff; font-size: 24px; font-weight: 600;">System Access Granted.</h2>
                            <p style="margin: 0; color: #bbbbbb; font-size: 16px; line-height: 1.6;">
                                Welcome to the grid, <strong>${data.username}</strong>. ServX is your unified dashboard to manage servers, databases, deployments, and security controls all in one place.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px 10px 30px;">
                            <h3 style="margin: 0; color: #00FFCC; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #333; padding-bottom: 10px;">Your Available Toolset</h3>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="40" valign="top" style="font-size: 20px;">⚡</td>
                                    <td>
                                        <h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 16px;">Auto-Medic Pipeline</h4>
                                        <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">Monitor frontend errors and DB timeouts live. Get AI-generated pull requests automatically created for detected issues.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="40" valign="top" style="font-size: 20px;">🗄️</td>
                                    <td>
                                        <h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 16px;">Universal Database Controller</h4>
                                        <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">Connect and query Supabase, MongoDB, Postgres, and Firebase from a single unified data grid.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="40" valign="top" style="font-size: 20px;">🌐</td>
                                    <td>
                                        <h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 16px;">Global Operations & Kill Switches</h4>
                                        <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">Trigger global maintenance mode, manage feature flags, and execute remote server tasks with a single click.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="40" valign="top" style="font-size: 20px;">🛡️</td>
                                    <td>
                                        <h4 style="margin: 0 0 5px 0; color: #ffffff; font-size: 16px;">Attack Path Visualization</h4>
                                        <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">Map your repository relationships and visualize potential vulnerabilities with our interactive 3D radar.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 40px 30px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" bgcolor="#00FFCC" style="border-radius: 4px;">
                                        <a href="https://servx.vercel.app/dashboard" target="_blank" class="cta-button" style="font-size: 16px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000000; text-decoration: none; padding: 15px 30px; border: 1px solid #00FFCC; display: inline-block; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">Initialize Dashboard</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 30px 30px 30px; text-align: center;">
                            <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.5;">
                                🔒 <strong>Security Note:</strong> All API keys added to your Connection Vault are encrypted at rest using AES-256.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #0A0A0A; border-top: 1px solid #222;">
                            <p style="margin: 0 0 10px 0; color: #777777; font-size: 12px;">
                                <a href="https://github.com/ChitkulLakshya/orizons" style="color: #00FFCC; text-decoration: none; margin: 0 10px;">GitHub</a> | 
                                <a href="mailto:servx.lab@gmail.com" style="color: #00FFCC; text-decoration: none; margin: 0 10px;">Support</a>
                            </p>
                            <p style="margin: 0; color: #555555; font-size: 12px;">
                                &copy; 2026 ServX Open Source Infrastructure.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
  } else {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0c10; font-family: 'Syne', sans-serif; padding: 40px 20px; min-height: 100vh; }
    .email-wrapper { max-width: 620px; margin: 0 auto; }
    .header { background: #0d1117; border: 1px solid #1e2530; border-bottom: none; border-radius: 16px 16px 0 0; padding: 32px 36px 28px; position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #4f8ef7 0%, #a78bfa 50%, #34d399 100%); }
    .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon { width: 38px; height: 38px; background: linear-gradient(135deg, #4f8ef7, #a78bfa); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 15px; color: #fff; letter-spacing: -1px; }
    .brand-name { font-size: 15px; font-weight: 700; color: #e2e8f0; letter-spacing: 0.02em; }
    .alert-badge { background: rgba(79, 142, 247, 0.12); border: 1px solid rgba(79, 142, 247, 0.3); border-radius: 20px; padding: 5px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #4f8ef7; letter-spacing: 0.08em; text-transform: uppercase; }
    .header-title { font-size: 26px; font-weight: 800; color: #f1f5f9; line-height: 1.2; letter-spacing: -0.02em; }
    .header-title span { background: linear-gradient(90deg, #4f8ef7, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header-sub { margin-top: 8px; font-size: 13.5px; color: #64748b; font-family: 'JetBrains Mono', monospace; }
    .body { background: #0d1117; border: 1px solid #1e2530; border-top: none; padding: 0 36px 36px; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, #1e2530 20%, #1e2530 80%, transparent); margin-bottom: 28px; }
    .provider-block { background: #111620; border: 1px solid #1e2530; border-radius: 12px; padding: 18px 22px; display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .provider-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #21262d; border: 1px solid #30363d; }
    .provider-info { flex: 1; }
    .provider-label { font-size: 11px; color: #475569; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
    .provider-value { font-size: 15px; font-weight: 700; color: #e2e8f0; }
    .section-label { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #475569; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 12px; }
    .info-grid { display: grid; gap: 10px; margin-bottom: 24px; }
    .info-row { background: #111620; border: 1px solid #1e2530; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .info-key { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; }
    .info-val { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #c9d1d9; font-weight: 600; text-align: right; word-break: break-all; }
    .info-val.uuid { font-size: 11.5px; color: #8b949e; }
    .timestamp-row { background: rgba(167, 139, 250, 0.05); border: 1px solid rgba(167, 139, 250, 0.15); border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .timestamp-key { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: #7c6fcd; text-transform: uppercase; letter-spacing: 0.08em; }
    .timestamp-val { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: #a78bfa; font-weight: 600; }
    .footer { background: #080a0d; border: 1px solid #1e2530; border-top: none; border-radius: 0 0 16px 16px; padding: 20px 36px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #334155; }
  </style>
</head>
<body>
<div class="email-wrapper">
  <div class="header">
    <div class="header-top">
      <div class="brand"><div class="brand-icon">SX</div><span class="brand-name">ServX Admin</span></div>
      <span class="alert-badge">⬤ New Signup</span>
    </div>
    <div class="header-title">New User <span>Registered</span></div>
    <div class="header-sub">// system event · auth.user.created</div>
  </div>
  <div class="body">
    <div class="divider"></div>
    <div class="section-label">Auth Provider</div>
    <div class="provider-block">
      <div class="provider-icon"><svg viewBox="0 0 24 24" fill="#e6edf3" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></div>
      <div class="provider-info"><div class="provider-label">Signed up via</div><div class="provider-value" style="color:#e6edf3">GitHub OAuth</div></div>
    </div>
    <div class="section-label">User Details</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-key">UUID</span><span class="info-val uuid">${data.uid}</span></div>
      <div class="info-row"><span class="info-key">Email</span><span class="info-val" style="color:#4f8ef7">${data.email}</span></div>
    </div>
    <div class="timestamp-row"><span class="timestamp-key">⏱ Registered At</span><span class="timestamp-val">${new Date().toISOString()}</span></div>
  </div>
  <div class="footer"><div>ServX · Admin Notifications</div><div>© 2026 ServX</div></div>
</div>
</body>
</html>`;
  }
}
