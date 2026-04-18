const { supabaseAdmin } = require('../utils/supabaseAdmin');
const Admin = require('../models/Admin');

/**
 * Access Middleware: isAdmin
 * Verifies the Supabase ID token and checks if the ID exists in the MongoDB Admins collection.
 */
const isAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // 1. Verify Supabase ID Token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(idToken);
    
    if (error || !user) {
      throw new Error(error?.message || 'Invalid token');
    }

    const id = user.id;

    // 2. Check if ID exists in MongoDB Admins collection
    const adminRecord = await Admin.findOne({ id });

    if (!adminRecord) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    // Attach admin info to request for downstream use
    req.admin = adminRecord;
    req.id = id;
    
    next();
  } catch (error) {
    console.error('isAdmin Middleware Error:', error.message);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = isAdmin;

