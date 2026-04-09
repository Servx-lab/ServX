import { useQuery } from '@tanstack/react-query';
import { getGmailStatus, getGmailInbox, getGoogleAuthUrl } from './api';

export const useGmailStatus = () => {
  return useQuery({
    queryKey: ['gmail-status'],
    queryFn: getGmailStatus,
    refetchOnWindowFocus: true,
  });
};

export const useGmailInbox = (enabled: boolean) => {
  return useQuery({
    queryKey: ['gmail-inbox'],
    queryFn: getGmailInbox,
    enabled,
  });
};

export const useGoogleAuthUrl = () => {
  return useQuery({
    queryKey: ['google-auth-url'],
    queryFn: getGoogleAuthUrl,
    enabled: false,
  });
};
