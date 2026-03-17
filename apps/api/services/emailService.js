/**
 * ServX Email Dispatcher
 * Sends transactional emails (e.g. welcome) via Gmail API using OAuth tokens from env.
 *
 * VERCEL_CLIENT_ID / VERCEL_CLIENT_SECRET are used as Google OAuth credentials.
 * refresh_token, access_token: From Gmail OAuth flow.
 */

const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VERCEL_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.VERCEL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || process.env.refresh_token;
const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN || process.env.access_token || process.env['access_token '];

function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN,
    access_token: ACCESS_TOKEN,
  });
  return oauth2Client;
}

/**
 * Sends an HTML email via Gmail API.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML body
 * @returns {Promise<void>}
 */
async function sendServXAlert(to, subject, htmlBody) {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.warn('[Email] Skipping: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or refresh_token not set');
    return;
  }

  try {
    const auth = getOAuth2Client();
    const gmail = google.gmail({ version: 'v1', auth });

    const raw = Buffer.from(
      [
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        htmlBody,
      ].join('\r\n')
    ).toString('base64url');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log('[Email] Welcome email sent to:', to);
  } catch (err) {
    console.error('[Email] Failed to send:', err.message);
    throw err;
  }
}

module.exports = { sendServXAlert };
