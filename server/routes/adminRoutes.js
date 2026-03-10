const express = require('express');
const router = express.Router();
const admin = require('../utils/firebaseAdmin');
const Admin = require('../models/Admin');
const isAdmin = require('../middleware/isAdmin');

// NOTE: All write operations should ideally be protected by the isAdmin middleware
// for production-level security.

/**
 * POST /api/admin/invite
 * Invites a user by email and saves their Firebase UID to the Admins collection.
 */
router.post('/invite', async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ message: 'Email and role are required' });
  }

  try {
    // 1. Find user by email in Firebase
    const userRecord = await admin.auth().getUserByEmail(email);
    const { uid } = userRecord;

    // 2. Check if user already exists as an admin
    const existingAdmin = await Admin.findOne({ uid });
    if (existingAdmin) {
      return res.status(400).json({ message: 'User is already an administrator' });
    }

    // 3. Save to MongoDB Admins collection
    const newAdmin = new Admin({
      uid,
      email,
      role,
      addedAt: new Date()
    });

    await newAdmin.save();

    res.status(201).json({ 
      message: 'Admin invited successfully', 
      admin: { uid, email, role } 
    });
  } catch (error) {
    console.error('Error in /api/admin/invite:', error.message);
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ message: 'User not found in Firebase. They must sign up first.' });
    }
    res.status(500).json({ message: 'Internal Server Error: ' + error.message });
  }
});

/**
 * GET /api/admin/list
 * Returns a list of all administrators.
 */
router.get('/list', async (req, res) => {
  try {
    const admins = await Admin.find().sort({ addedAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admins' });
  }
});

/**
 * DELETE /api/admin/revoke/:uid
 * Removes a user from the Admins collection.
 */
router.delete('/revoke/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const deleted = await Admin.findOneAndDelete({ uid });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error revoking access' });
  }
});

module.exports = router;
