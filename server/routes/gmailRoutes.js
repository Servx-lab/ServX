const express = require('express');
const { google } = require('googleapis');
const UserConnection = require('../models/UserConnection');
const requireAuth = require('../middleware/requireAuth');
const crypto = require('crypto');

const router = express.Router();

// Initialize OAuth2 Client
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || process.env.VERCEL_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET || process.env.VERCEL_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// Encryption helpers (reusing existing logic if possible, or defining simple ones here)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_32_chars_long!'; // Must be 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// GET /api/auth/google/url
// Generates the OAuth URL
router.get('/auth/google/url', requireAuth, (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();
    
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force to get refresh token
      state: req.user.uid // Pass user ID in state to retrieve in callback
    });

    res.json({ url });
  } catch (error) {
    console.error('Error generating Google OAuth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// GET /api/auth/google/callback
// Handles the OAuth callback from Google
router.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('Google OAuth Error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8083'}/emails?error=oauth_failed`);
  }

  if (!code || !state) {
    return res.status(400).send('Missing code or state parameter');
  }

  const uid = state; // We passed the UID in the state parameter

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // We need the refresh token to maintain long-term access
    if (tokens.refresh_token) {
      const encryptedToken = encrypt(tokens.refresh_token);
      
      // Save or update the connection
      await UserConnection.findOneAndUpdate(
        { ownerUid: uid, provider: 'Google' },
        {
          name: 'Gmail Integration',
          token: encryptedToken,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    } else {
      // If no refresh token is provided (e.g., user already authorized and didn't force consent)
      // Check if we already have one
      const existing = await UserConnection.findOne({ ownerUid: uid, provider: 'Google' });
      if (!existing) {
        // We need a refresh token. We should probably redirect them to try again with prompt=consent
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8083'}/emails?error=no_refresh_token`);
      }
    }

    // Redirect back to the frontend
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8083'}/emails?success=true`);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8083'}/emails?error=callback_failed`);
  }
});

// GET /api/gmail/status
router.get('/gmail/status', requireAuth, async (req, res) => {
  try {
    const connection = await UserConnection.findOne({ ownerUid: req.user.uid, provider: 'Google' });
    res.json({ connected: !!connection });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// GET /api/gmail/inbox
router.get('/gmail/inbox', requireAuth, async (req, res) => {
  try {
    const connection = await UserConnection.findOne({ ownerUid: req.user.uid, provider: 'Google' });
    if (!connection || !connection.token) {
      return res.status(401).json({ error: 'Gmail not connected' });
    }

    const refreshToken = decrypt(connection.token);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Fetch latest 10 emails
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'in:inbox'
    });

    const messages = response.data.messages || [];
    
    // Fetch details for each message
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        const msgData = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });
        
        const headers = msgData.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        return {
          id: msg.id,
          snippet: msgData.data.snippet,
          subject,
          from,
          date
        };
      })
    );

    res.json(emailDetails);
  } catch (error) {
    console.error('Error fetching Gmail inbox:', error);
    if (error.code === 401 || error.message.includes('invalid_grant')) {
      // Token might be revoked
      await UserConnection.deleteOne({ ownerUid: req.user.uid, provider: 'Google' });
      return res.status(401).json({ error: 'Gmail authentication expired. Please reconnect.' });
    }
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

module.exports = router;
