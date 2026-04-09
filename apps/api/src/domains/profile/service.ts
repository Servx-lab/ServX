import { randomInt } from 'node:crypto';

import User from '../auth/model';

// In-memory OTP store: { "uid:email": { otp, expiresAt } }
const otpStore = new Map<string, { otp: string; email: string; expiresAt: number }>();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

export function getOtpKey(uid: string, email: string): string {
  return `${uid}:${email.toLowerCase()}`;
}

export function cleanupExpiredOtps(): void {
  const now = Date.now();
  for (const [key, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}

export function saveOtp(uid: string, email: string, otp: string): void {
  const key = getOtpKey(uid, email);
  otpStore.set(key, {
    otp,
    email: email.toLowerCase(),
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  });
  cleanupExpiredOtps();
}

export function verifyAndDeleteOtp(uid: string, email: string, otp: string): boolean {
  const key = getOtpKey(uid, email);
  const stored = otpStore.get(key);

  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(key);
    return false;
  }

  if (stored.otp !== otp.trim()) return false;

  otpStore.delete(key);
  return true;
}

export async function getUserProfile(uid: string) {
  const user = await User.findOne({ uid }).select('-githubAccessToken').lean();
  return user;
}
