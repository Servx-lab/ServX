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