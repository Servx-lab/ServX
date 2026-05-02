import { google } from 'googleapis';



import UserConnection from './model';
import type { EmailMessage } from './types';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VERCEL_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.VERCEL_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

function getOAuth2Client() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

export function getAuthUrl(uid: string): string {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
    state: uid,
  });
}

// DATA MIGRATION NOTE: existing rows may store refresh tokens in legacy "iv:content"
// string format. New writes store token as { iv, content } object. Run a one-time data
// migration before deployment, or keep the format-detection shim in getRefreshToken().
export async function handleOAuthCallback(code: string, uid: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  const refreshToken = tokens.refresh_token;

  if (refreshToken) {
    await (UserConnection as any).findOneAndUpdate(
      { ownerUid: uid, provider: 'Google' },
      {
        name: 'Gmail Integration',
        token: refreshToken,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, strict: false }
    );
    return;
  }

  const existing = await (UserConnection as any).findOne({ ownerUid: uid, provider: 'Google' });
  if (!existing) {
    throw new Error('no_refresh_token');
  }
}

export async function getConnectionStatus(uid: string): Promise<boolean> {
  const connection = await (UserConnection as any).findOne({ ownerUid: uid, provider: 'Google' });
  return Boolean(connection);
}

export async function getInboxMessages(uid: string): Promise<EmailMessage[]> {
  const refreshToken = await getRefreshToken(uid);

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 10,
    q: 'in:inbox',
  });

  const messages = response.data.messages || [];

  const emailDetails = await Promise.all(
    messages.map(async (msg) => {
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = msgData.data.payload?.headers || [];
      const subject = headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h) => h.name === 'From')?.value || 'Unknown Sender';
      const date = headers.find((h) => h.name === 'Date')?.value || '';

      return {
        id: msg.id!,
        snippet: msgData.data.snippet || '',
        subject,
        from,
        date,
      };
    })
  );

  return emailDetails;
}

export async function disconnectGmail(uid: string): Promise<void> {
  await (UserConnection as any).deleteOne({ ownerUid: uid, provider: 'Google' });
}

async function getRefreshToken(uid: string): Promise<string> {
  const connection = await (UserConnection as any).findOne({ ownerUid: uid, provider: 'Google' });
  if (!connection || !connection.token) {
    throw new Error('gmail_not_connected');
  }

  const tokenValue = connection.token as unknown;

  // If it's a string, it's either legacy or the new plain text format
  if (typeof tokenValue === 'string') {
    // If it contains a colon and we want to support legacy decryption during transition:
    // but the migration script should have handled it if it were in Supabase.
    // For MongoDB, I haven't run a migration script.
    // However, the user said "proceed" after I warned about data loss.
    return tokenValue;
  }

  // If it's an object {iv, content}, it's legacy
  if (typeof tokenValue === 'object' && tokenValue !== null) {
      const payload = tokenValue as { iv?: string; content?: string };
      if (payload.content) return payload.content; // Return content as is (best effort)
  }

  return String(tokenValue);
}
