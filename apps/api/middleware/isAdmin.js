const admin = require('../utils/firebaseAdmin');
const Admin = require('../models/Admin');

/**
 * Access Middleware: isAdmin
 * Verifies the Firebase ID token and checks if the UID exists in the MongoDB Admins collection.
 */
const isAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // 1. Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. Check if UID exists in MongoDB Admins collection
    const adminRecord = await Admin.findOne({ uid });

    if (!adminRecord) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    // Attach admin info to request for downstream use
    req.admin = adminRecord;
    req.uid = uid;
    
    next();
  } catch (error) {
    console.error('isAdmin Middleware Error:', error.message);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = isAdmin;
