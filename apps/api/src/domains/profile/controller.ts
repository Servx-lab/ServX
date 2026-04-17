import type { Request, Response, NextFunction } from 'express';
import { AuthError, ValidationError } from '@servx/errors';
import User from '../auth/model';
import * as profileService from './service';
import { sendOTPEmailService } from '../../core/services/emailService';

export async function getProfile(req: any, res: Response, next: NextFunction) {
  try {
    const user = await profileService.getUserProfile(req.user.uid);

    if (!user) {
      throw new AuthError('User not found');
    }

    res.json({
      name: user.name || '',
      email: user.email || '',
      avatarUrl: user.avatarUrl || '',
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: any, res: Response, next: NextFunction) {
  try {
    const { name, avatarUrl } = req.body;
    const { data: updated, error } = await profileService.supabaseAdmin
        .from('user_profiles')
        .update({
            display_name: name,
            avatar_url: avatarUrl,
        })
        .eq('id', req.user.uid)
        .select()
        .single();

    if (error || !updated) {
      throw new AuthError('Failed to update profile');
    }

    res.json({
      name: updated.display_name || '',
      email: updated.email || '',
      avatarUrl: updated.avatar_url || '',
    });
  } catch (err) {
    next(err);
  }
}

export async function sendEmailOTP(req: any, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const uid = req.user.uid;

    if (!email || typeof email !== 'string') {
      throw new ValidationError('Valid email is required', { email: 'Valid email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new ValidationError('Invalid email format', { email: 'Invalid email format' });
    }

    // Check if email is already used by another user
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing && existing.uid !== uid) {
      return res.status(409).json({ message: 'This email is already in use' });
    }

    const otp = profileService.generateOTP();
    profileService.saveOtp(uid, normalizedEmail, otp);

    await sendOTPEmailService(normalizedEmail, otp);

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: any, res: Response, next: NextFunction) {
  try {
    const { email, otp } = req.body;
    const uid = req.user.uid;

    if (!email || !otp) {
      throw new ValidationError('Email and OTP are required', { email, otp });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isValid = profileService.verifyAndDeleteOtp(uid, normalizedEmail, String(otp));

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const { error } = await profileService.supabaseAdmin
        .from('user_profiles')
        .update({ email: normalizedEmail })
        .eq('id', uid);

    if (error) {
      throw new AuthError('Failed to update email');
    }

    res.json({
      message: 'Email verified successfully',
      email: normalizedEmail,
    });
  } catch (err) {
    next(err);
  }
}
