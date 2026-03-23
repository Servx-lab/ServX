import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Loader2,
  CheckCircle2,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';

interface ProfileData {
  username: string;
  name: string;
  surname: string;
  email: string;
  emailVerified: boolean;
}

const ProfileSettings = () => {
  const [profile, setProfile] = useState<ProfileData>({
    username: '',
    name: '',
    surname: '',
    email: '',
    emailVerified: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/profile');
      setProfile(res.data);
      setEmailInput(res.data.email || '');
    } catch (err: any) {
      toast({
        title: 'Failed to load profile',
        description: err.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put('/profile', {
        username: profile.username,
        name: profile.name,
        surname: profile.surname,
      });
      toast({
        title: 'Profile updated',
        description: 'Your username, name, and surname have been saved.',
      });
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendOtp = async () => {
    const email = emailInput.trim();
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setSendingOtp(true);
    try {
      await apiClient.post('/profile/send-email-otp', { email });
      setOtpSent(true);
      setOtpValue('');
      toast({
        title: 'OTP sent',
        description: `A verification code was sent to ${email}. Check your inbox.`,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to send OTP',
        description: err.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyEmail = async () => {
    const email = emailInput.trim();
    if (!email || otpValue.length !== 6) {
      toast({
        title: 'Verification required',
        description: 'Enter the 6-digit code from your email.',
        variant: 'destructive',
      });
      return;
    }

    setVerifying(true);
    try {
      const res = await apiClient.post('/profile/verify-email', { email, otp: otpValue });
      setProfile((p) => ({ ...p, email: res.data.email, emailVerified: true }));
      setOtpSent(false);
      setOtpValue('');
      toast({
        title: 'Email verified',
        description: 'Your email has been verified and saved.',
      });
    } catch (err: any) {
      toast({
        title: 'Verification failed',
        description: err.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-black">
          Profile Settings
        </h1>
        <p className="text-gray-500 max-w-2xl">
          Edit your username, name, surname, and email. Email changes require verification via OTP.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-cyan-600">
              <User className="w-5 h-5" />
              <CardTitle className="text-lg text-black">Personal Information</CardTitle>
            </div>
            <CardDescription className="text-gray-500">
              Update your display name and username.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="johndoe"
                className="bg-white border-gray-200"
                value={profile.username}
                onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="John"
                  className="bg-white border-gray-200"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="surname">Surname</Label>
                <Input
                  id="surname"
                  placeholder="Doe"
                  className="bg-white border-gray-200"
                  value={profile.surname}
                  onChange={(e) => setProfile((p) => ({ ...p, surname: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-cyan-600">
              <Mail className="w-5 h-5" />
              <CardTitle className="text-lg text-black">Email Address</CardTitle>
              {profile.emailVerified && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Verified
                </span>
              )}
            </div>
            <CardDescription className="text-gray-500">
              Add or change your email. You must verify it with a one-time code sent to your inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="bg-white border-gray-200 flex-1"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setOtpSent(false);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !emailInput.trim()}
                  className="border-gray-300"
                >
                  {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="ml-2 hidden sm:inline">Send OTP</span>
                </Button>
              </div>
            </div>

            {otpSent && (
              <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <ShieldCheck className="w-4 h-4 text-cyan-600" />
                  Enter the 6-digit code sent to {emailInput}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={setOtpValue}
                  >
                    <InputOTPGroup className="gap-1">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <Button
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={verifying || otpValue.length !== 6}
                    className="bg-cyan-600 hover:bg-cyan-500"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verify
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="text-xs text-cyan-600 hover:text-cyan-700"
                >
                  Resend code
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default ProfileSettings;
