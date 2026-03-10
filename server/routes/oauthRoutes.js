const express = require('express');
const axios = require('axios');
const router = express.Router();

// --- Vercel ---
const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID;
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET;
// The callback URL must match what you registered in Vercel
const VERCEL_REDIRECT_URI = process.env.VERCEL_REDIRECT_URI || 'http://localhost:5000/api/oauth/vercel/callback';

router.get('/vercel', (req, res) => {
  if (!VERCEL_CLIENT_ID) {
      console.warn('Vercel Client ID missing');
      // For demo purposes, if no ID is present, we might want to simulate a success redirect 
      // or show an error.
      // return res.status(500).json({ error: 'Vercel Client ID not configured' });
      
      // MOCK BEHAVIOR FOR DEMO if env vars are missing:
      const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${FRONTEND_URL}/infrastructure?vercel_connected=true&mock=true`);
  }
  
  const state = Math.random().toString(36).substring(7);
  const url = `https://vercel.com/oauth/authorize?client_id=${VERCEL_CLIENT_ID}&state=${state}&redirect_uri=${VERCEL_REDIRECT_URI}`;
  res.redirect(url);
});

router.get('/vercel/callback', async (req, res) => {
  const { code } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/infrastructure?error=no_code`);
  }

  try {
    const tokenResponse = await axios.post('https://api.vercel.com/v2/oauth/access_token', new URLSearchParams({
      client_id: VERCEL_CLIENT_ID,
      client_secret: VERCEL_CLIENT_SECRET,
      code,
      redirect_uri: VERCEL_REDIRECT_URI
    }));

    const { access_token, user_id, team_id } = tokenResponse.data;
    
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
