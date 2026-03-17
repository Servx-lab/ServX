const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');
const { sendOTPEmail } = require('../services/emailService');

const router = express.Router();

// In-memory OTP store: { "uid:email": { otp, expiresAt } }
const otpStore = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function getOtpKey(uid, email) {
  return `${uid}:${email.toLowerCase()}`;
}

function cleanupExpiredOtps() {
  const now = Date.now();
  for (const [key, data] of otpStore.entries()) {
    if (data.expiresAt < now) otpStore.delete(key);
  }
}

// GET /api/profile - Get current user profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid })
      .select('-githubAccessToken')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      username: user.username || '',
      name: user.name || '',
      surname: user.surname || '',
      email: user.email || '',
      emailVerified: user.emailVerified || false,
      avatarUrl: user.avatarUrl || '',
    });
  } catch (err) {
    console.error('[Profile] GET error:', err.message);
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// PUT /api/profile - Update username, name, surname (no email change)
router.put('/', requireAuth, async (req, res) => {
  try {
    const { username, name, surname } = req.body;
    const user = await User.findOne({ uid: req.user.uid });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username !== undefined) user.username = String(username).trim();
    if (name !== undefined) user.name = String(name).trim() || user.name;
    if (surname !== undefined) user.surname = String(surname).trim();

    await user.save();

    res.json({
      username: user.username || '',
      name: user.name || '',
      surname: user.surname || '',
      email: user.email || '',
      emailVerified: user.emailVerified || false,
    });
  } catch (err) {
    console.error('[Profile] PUT error:', err.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// POST /api/profile/send-email-otp - Send OTP to the email user typed
router.post('/send-email-otp', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    const uid = req.user.uid;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email is already used by another user
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing && existing.uid !== uid) {
      return res.status(409).json({ message: 'This email is already in use' });
    }

    const otp = generateOTP();
    const key = getOtpKey(uid, normalizedEmail);
    otpStore.set(key, {
      otp,
      email: normalizedEmail,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
    });
    cleanupExpiredOtps();

    await sendOTPEmail(normalizedEmail, otp);

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error('[Profile] send-email-otp error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to send OTP' });
  }
});

// POST /api/profile/verify-email - Verify OTP and save email
router.post('/verify-email', requireAuth, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const uid = req.user.uid;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const key = getOtpKey(uid, normalizedEmail);
    const stored = otpStore.get(key);

    if (!stored) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    if (stored.otp !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    otpStore.delete(key);

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.email = normalizedEmail;
    user.emailVerified = true;
    await user.save();

    res.json({
      message: 'Email verified successfully',
      email: normalizedEmail,
      emailVerified: true,
    });
  } catch (err) {
    console.error('[Profile] verify-email error:', err.message);
    res.status(500).json({ message: 'Failed to verify email' });
  }
});

module.exports = router;
