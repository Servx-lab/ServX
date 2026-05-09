import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getAdminList, 
  inviteAdmin, 
  revokeAdmin, 
  getAdminResources 
} from './api';
import { toast } from 'sonner';

export const useAdminList = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin-list'],
    queryFn: getAdminList,
    enabled: !!user,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error.response?.status === 401 || error.response?.status === 403) return false;
      return failureCount < 3;
    }
  });
};

export const useInviteAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inviteAdmin,
    onSuccess: () => {
      toast.success("Administrator invited successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-list'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to invite administrator");
    },
  });
};

export const useRevokeAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeAdmin,
    onSuccess: () => {
      toast.success("Access revoked successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-list'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to revoke access");
    },
  });
};

export const useAdminResources = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin-resources'],
    queryFn: getAdminResources,
    enabled: !!user,
    retry: (failureCount, error: any) => {
      if (error.response?.status === 401 || error.response?.status === 403) return false;
      return failureCount < 3;
    }
  });
};
