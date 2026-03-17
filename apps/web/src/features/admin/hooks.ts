import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAdminList, 
  inviteAdmin, 
  revokeAdmin, 
  getAdminResources 
} from './api';
import { toast } from 'sonner';

export const useAdminList = () => {
  return useQuery({
    queryKey: ['admin-list'],
    queryFn: getAdminList,
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
  return useQuery({
    queryKey: ['admin-resources'],
    queryFn: getAdminResources,
  });
};
