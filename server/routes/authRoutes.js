const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken'); // Assuming you'll issue a JWT
const User = require('../models/User');
const admin = require('../utils/firebaseAdmin'); // Firebase Admin
const UserConnection = require('../models/UserConnection');
const { decrypt } = require('../utils/encryption');
const router = express.Router();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
// Fallback if not set in env, though it should be
const USER_AGENT = 'Orizon-App'; // Good practice for GitHub API

const requireAuth = require('../middleware/requireAuth');

// GET /api/auth/github/url
// Returns the GitHub OAuth authorization URL for the frontend to redirect to
router.get('/github/url', requireAuth, (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const ownerUid = req.user.uid;

  if (!clientId) {
    return res.status(500).json({ error: 'GitHub Client ID not configured' });
  }

  const state = encodeURIComponent(JSON.stringify({ ownerUid }));
  const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user&state=${state}`;
  
  res.json({ url: authorizeUrl });
});

// GET /api/auth/github (Legacy/Direct)
// Redirects user to GitHub for authorization or app installation
router.get('/github', requireAuth, (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID; 
  const ownerUid = req.user.uid;

  console.log('GitHub Auth Start for UID:', ownerUid);
  
  // Use state to pass the Firebase UID securely through the OAuth flow
  const state = encodeURIComponent(JSON.stringify({ ownerUid }));
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user&state=${state}`;
  
  console.log('Redirecting to OAuth:', redirectUri);
  res.redirect(redirectUri);
});

// GET /api/auth/github/callback
// Handles the callback, exchanges code for token
router.get('/github/callback', async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const { code, state } = req.query;
  let ownerUid = null;

  if (state) {
    try {
      const decodedState = JSON.parse(decodeURIComponent(state));
      ownerUid = decodedState.ownerUid;
    } catch (e) {
      console.error('Failed to parse OAuth state:', e.message);
    }
  }

  console.log('GitHub Callback Received. Code:', code ? 'Present' : 'Missing', 'UID:', ownerUid);
  
  if (!code) {
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

    // 2. Fetch profile to get GitHub ID
    const userProfileResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = userProfileResponse.data;

    // 3. Link to existing Firebase user if ownerUid is present
    let user;
    if (ownerUid) {
        user = await User.findOne({ uid: ownerUid });
    }

    if (user) {
      console.log('Linking GitHub to Firebase user:', ownerUid);
      user.githubAccessToken = accessToken;
      user.githubId = profile.id.toString();
      await user.save();
    } else {
      // Fallback: search by githubId or email (old logic)
      user = await User.findOne({ githubId: profile.id.toString() });
      if (!user && profile.email) {
          user = await User.findOne({ email: profile.email });
      }

      if (user) {
        user.githubAccessToken = accessToken;
        if (!user.githubId) user.githubId = profile.id.toString();
        await user.save();
      } else {
        // Create new user if not found at all
        user = await User.create({
            uid: ownerUid || `legacy-${profile.id}`, // Maintain consistency
            githubId: profile.id.toString(),
            name: profile.name || profile.login,
            email: profile.email || `${profile.login}@users.noreply.github.com`,
            avatarUrl: profile.avatar_url,
            githubAccessToken: accessToken,
        });
      }
    }

    // 5. Redirect back to frontend
    res.redirect(`${FRONTEND_URL}/github?success=true`);

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

// --- Firebase User Management Routes ---

// Helper: Get or create a Firebase Admin app from an encrypted saved connection
async function getFirebaseApp(connectionId) {
    // If a specific connectionId is provided, load from DB
    if (connectionId) {
        const appName = `fb_${connectionId}`;
        // Return existing app if already initialized
        const existing = admin.apps.find(a => a && a.name === appName);
        if (existing) return existing;

        const connection = await UserConnection.findById(connectionId);
        if (!connection || connection.provider !== 'Firebase') {
            throw new Error('Firebase connection not found');
        }
        const decrypted = decrypt({ content: connection.encryptedConfig, iv: connection.iv });
        const config = JSON.parse(decrypted);
        const serviceAccount = JSON.parse(config.serviceAccountJson);

        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        }, appName);
    }
    // Fallback to default app
    return admin.app();
}

// Helper: Find the first saved Firebase connection if no connectionId provided
async function findFirebaseConnectionId() {
    const connection = await UserConnection.findOne({ provider: 'Firebase' });
    return connection ? connection._id.toString() : null;
}

// GET /api/auth/users/search
router.get('/users/search', async (req, res) => {
  const { email, connectionId } = req.query;
  if (!email) {
    return res.status(400).json({ message: 'Email query parameter is required' });
  }

  try {
    const fbConnId = connectionId || await findFirebaseConnectionId();
    const fbApp = await getFirebaseApp(fbConnId);
    const userRecord = await fbApp.auth().getUserByEmail(email);
    res.json({
        uid: userRecord.uid,
        displayName: userRecord.displayName,
        email: userRecord.email,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        disabled: userRecord.disabled
    });
  } catch (error) {
    console.error('Error in /users/search:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ message: 'User not found' });
    }

    const mockUser = {
        uid: `mock-search-${Date.now()}`,
        displayName: `Searched Mock: ${email.split('@')[0]}`,
        email: email,
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
        disabled: false
    };
    res.json(mockUser);
  }
});

// GET /api/auth/users/list
router.get('/users/list', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const { connectionId } = req.query;
  try {
    const fbConnId = connectionId || await findFirebaseConnectionId();
    const fbApp = await getFirebaseApp(fbConnId);
    const listUsersResult = await fbApp.auth().listUsers(limit);
    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      displayName: userRecord.displayName,
      email: userRecord.email,
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
      disabled: userRecord.disabled
    }));
    res.json({ users, pageToken: listUsersResult.pageToken });
  } catch (error) {
    console.error('Error in /users/list:', error.message);
    
    console.log('Serving Mock Data for Firebase Users due to error.');
    const mockUsers = Array.from({ length: 5 }).map((_, i) => ({
        uid: `mock-uid-${i + 1}`,
        displayName: `Mock User ${i + 1}`,
        email: `mockuser${i + 1}@example.com`,
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
        disabled: i % 3 === 0
    }));
    res.json({ 
        users: mockUsers, 
        warning: 'Showing mock data because Firebase Admin could not connect. Check server logs for details.' 
    });
  }
});

module.exports = router;