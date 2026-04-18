const { supabaseAdmin } = require('../utils/supabaseAdmin');

/**
 * Middleware to verify Supabase ID Token and attach user ID to request
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
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      throw new Error(error?.message || 'Invalid token');
    }

    console.log('[Auth] Token verified for ID:', user.id);
    // Attach the global ID to the request object
    req.user = {
      id: user.id,
      email: user.email
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

