const express = require('express');
const axios = require('axios');
const router = express.Router();

// --- Vercel ---
const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID;
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET;
// The callback URL must match what you registered in Vercel
const VERCEL_REDIRECT_URI = process.env.VERCEL_REDIRECT_URI || 'http://localhost:5000/api/oauth/vercel/callback';

const UserConnection = require('../models/UserConnection');
const { decrypt } = require('../utils/encryption');

router.get('/vercel', async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const userId = req.query.userId || req.user?.uid || 'mock-user-123';

  try {
    // 1. Fetch the user's Vercel connection from DB
    const connection = await UserConnection.findOne({ 
      userId, 
      provider: 'Vercel' 
    });

    if (!connection) {
       // If no custom connection, fallback to mock demo or error
       if (!VERCEL_CLIENT_ID) {
         return res.redirect(`${FRONTEND_URL}/infrastructure?vercel_connected=true&mock=true`);
       }
       // Process with global ID if available
       const state = Math.random().toString(36).substring(7);
       const url = `https://vercel.com/oauth/authorize?client_id=${VERCEL_CLIENT_ID}&state=${state}&redirect_uri=${VERCEL_REDIRECT_URI}`;
       return res.redirect(url);
    }

    // 2. Decrypt user-specific credentials
    const decryptedConfig = JSON.parse(decrypt({
      content: connection.encryptedConfig,
      iv: connection.iv
    }));

    const clientId = decryptedConfig.clientId;
    if (!clientId) throw new Error('Client ID missing in connection config');

    const state = Math.random().toString(36).substring(7);
    const url = `https://vercel.com/oauth/authorize?client_id=${clientId}&state=${state}&redirect_uri=${VERCEL_REDIRECT_URI}&user_id=${userId}`; // Pass user_id for callback context
    res.redirect(url);

  } catch (error) {
    console.error('Vercel OAuth Setup Error:', error.message);
    res.redirect(`${FRONTEND_URL}/infrastructure?error=vercel_setup_failed`);
  }
});

router.get('/vercel/callback', async (req, res) => {
  const { code, user_id: userId } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const targetUserId = userId || 'mock-user-123';

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/infrastructure?error=no_code`);
  }

  try {
    // 1. Get user's credentials again for token exchange
    const connection = await UserConnection.findOne({ userId: targetUserId, provider: 'Vercel' });
    let clientId = VERCEL_CLIENT_ID;
    let clientSecret = VERCEL_CLIENT_SECRET;

    if (connection) {
      const decryptedConfig = JSON.parse(decrypt({
        content: connection.encryptedConfig,
        iv: connection.iv
      }));
      clientId = decryptedConfig.clientId;
      clientSecret = decryptedConfig.clientSecret;
    }

    const tokenResponse = await axios.post('https://api.vercel.com/v2/oauth/access_token', new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: VERCEL_REDIRECT_URI
    }));

    const { access_token } = tokenResponse.data;
    
    // TODO: Save access_token to the authenticated user's record in DB
    console.log('Vercel Auth Success:', { user_id, team_id });

    // Redirect back to frontend
    res.redirect(`${FRONTEND_URL}/infrastructure?vercel_connected=true`);
  } catch (error) {
    console.error('Vercel OAuth Error:', error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/infrastructure?error=vercel_auth_failed`);
  }
});

// --- DigitalOcean ---
const DO_CLIENT_ID = process.env.DO_CLIENT_ID;
const DO_REDIRECT_URI = process.env.DO_REDIRECT_URI || 'http://localhost:5000/api/oauth/digitalocean/callback';

router.get('/digitalocean', (req, res) => {
    if (!DO_CLIENT_ID) {
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${FRONTEND_URL}/infrastructure?digitalocean_connected=true&mock=true`);
    }
    const url = `https://cloud.digitalocean.com/v1/oauth/authorize?client_id=${DO_CLIENT_ID}&redirect_uri=${DO_REDIRECT_URI}&response_type=code&scope=read write`;
    res.redirect(url);
});

router.get('/digitalocean/callback', (req, res) => {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Mock success for now as we might not have real logic
    res.redirect(`${FRONTEND_URL}/infrastructure?digitalocean_connected=true`);
});

// --- Railway ---
router.get('/railway', (req, res) => {
    // Railway doesn't have a public OAuth API in the same way, usually use API tokens. 
    // But for consistency:
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${FRONTEND_URL}/infrastructure?railway_connected=true&mock=true`);
});

module.exports = router;
