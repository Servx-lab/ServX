const admin = require('../utils/firebaseAdmin');

/**
 * Middleware to verify Firebase ID Token and attach user UID to request
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] Missing or malformed header:', authHeader);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Missing or malformed Authorization header' 
    });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('[Auth] Token verified for UID:', decodedToken.uid);
    // Attach the global UID to the request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid or expired token' 
    });
  }
};

module.exports = requireAuth;
