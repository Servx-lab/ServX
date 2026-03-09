const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken'); // Assuming you'll issue a JWT
const User = require('../models/User');
const router = express.Router();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
// Fallback if not set in env, though it should be
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// GET /api/auth/github
// Redirects user to GitHub for authorization
router.get('/github', (req, res) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo,read:user`;
  res.redirect(redirectUri);
});

// GET /api/auth/github/callback
// Handles the callback, exchanges code for token
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('No code provided');
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
      throw new Error('Failed to obtain access token from GitHub');
    }

    // 2. Initial fetch of user profile to identify them in our DB
    const userProfileResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profile = userProfileResponse.data;

    // 3. Find or Create User in DB
    let user = await User.findOne({ githubId: profile.id.toString() });

    if (!user) {
        // Try to find by email if available to link accounts
        if (profile.email) {
            user = await User.findOne({ email: profile.email });
        }
    }

    if (user) {
      // Update access token
      user.githubAccessToken = accessToken;
      if (!user.githubId) user.githubId = profile.id.toString(); // Link if found by email
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        githubId: profile.id.toString(),
        name: profile.name || profile.login,
        email: profile.email || `${profile.login}@github.placeholder.com`, // Email might be private
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
    console.error('GitHub Auth Error:', error.message);
    res.redirect(`${FRONTEND_URL}/github?error=auth_failed`);
  }
});

module.exports = router;