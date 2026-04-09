import apiClient from '@/lib/apiClient';
import { GmailStatus, GmailInboxResponse, GoogleAuthUrlResponse } from './types';

export const getGmailStatus = async (): Promise<GmailStatus> => {
  const res = await apiClient.get('/gmail/status');
  return res.data;
};

export const getGmailInbox = async (): Promise<GmailInboxResponse> => {
  const res = await apiClient.get('/gmail/inbox');
  return res.data;
};

export const getGoogleAuthUrl = async (): Promise<GoogleAuthUrlResponse> => {
  const res = await apiClient.get('/auth/google/url');
  return res.data;
};
