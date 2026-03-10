const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken'); // Assuming you'll issue a JWT
const User = require('../models/User');
const router = express.Router();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
// Fallback if not set in env, though it should be
const USER_AGENT = 'Orizon-App'; // Good practice for GitHub API

// GET /api/auth/github
// Redirects user to GitHub for authorization or app installation
router.get('/github', (req, res) => {
  const appName = process.env.GITHUB_APP_NAME;
  const clientId = process.env.GITHUB_CLIENT_ID; 

  console.log('GitHub Auth Start:', { appName, clientId: clientId ? 'Exists' : 'Missing' });
  
  // Always use the OAuth flow for "Connecting" existing users or simple auth
  // The App Install flow is only needed if you specifically want to trigger a new installation
  // Standard OAuth will ask for permissions on installed repos anyway
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user`;
  console.log('Redirecting to OAuth:', redirectUri);
  res.redirect(redirectUri);
});

// GET /api/auth/github/callback
// Handles the callback, exchanges code for token
router.get('/github/callback', async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const { code } = req.query;

  console.log('GitHub Callback Received. Code:', code ? 'Present' : 'Missing');
  console.log('Using Credentials:', { 
    clientId: CLIENT_ID, 
    clientSecretHeader: CLIENT_SECRET ? `...${CLIENT_SECRET.slice(-4)}` : 'Missing' 
  });

  if (!code) {
    // Redirect to frontend with error instead of sending 400 text
    return res.redirect(`${FRONTEND_URL}/github?error=no_code_provided`);
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      console.error('GitHub Token Exchange Failed. Response:', tokenResponse.data);
      throw new Error(`Failed to obtain access token from GitHub: ${tokenResponse.data.error_description || tokenResponse.data.error || 'Unknown error'}`);
    }

    // 2. Initial fetch of user profile to identify them in our DB
    const userProfileResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profile = userProfileResponse.data;
    console.log('GitHub Profile Fetched:', { id: profile.id, login: profile.login, email: profile.email });

    // 3. Find or Create User in DB
    let user = await User.findOne({ githubId: profile.id.toString() });

    if (!user) {
        // Try to find by email if available to link accounts
        if (profile.email) {
            user = await User.findOne({ email: profile.email });
        }
    }

    if (user) {
      console.log('Updating existing user:', user._id);
      // Update access token
      user.githubAccessToken = accessToken;
      if (!user.githubId) user.githubId = profile.id.toString(); // Link if found by email
      await user.save();
    } else {
      console.log('Creating new user for:', profile.login);
      // Create new user
      user = await User.create({
        githubId: profile.id.toString(),
        name: profile.name || profile.login,
        email: profile.email || `${profile.login}@users.noreply.github.com`, // Use standard GitHub no-reply format
        avatarUrl: profile.avatar_url,
        githubAccessToken: accessToken,
      });
    }

    // 4. Issue a session token (JWT) for OUR app
    // This token encodes the user ID, so future requests can look up the user & their GitHub token
    const sessionToken = jwt.sign({ userId: user._id }, process.env.ENCRYPTION_KEY || 'secret', { expiresIn: '7d' });

    // 5. Redirect back to frontend with the token
    // In a real app, you might use a cookie, but query param is simple for now
    res.redirect(`${FRONTEND_URL}/github?token=${sessionToken}`);

  } catch (error) {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.error('GitHub Auth Error:', error.message);
    if (error.response) {
       console.error('Data:', error.response.data);
       console.error('Status:', error.response.status);
    }
    // Pass error details to frontend for debugging
    res.redirect(`${FRONTEND_URL}/github?error=auth_failed&details=${encodeURIComponent(error.message)}`);
  }
});

module.exports = router;