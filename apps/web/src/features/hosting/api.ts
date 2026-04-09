import apiClient from '@/lib/apiClient';
import type {
  ConnectHostingBody,
  ConnectionListItem,
  ConnectionResponse,
  HostingStatusResponse,
} from './types';

export async function getHostingStatus(provider: string): Promise<HostingStatusResponse> {
  const res = await apiClient.get<HostingStatusResponse>(
    `/connections/hosting/${provider}/status`,
  );
  return res.data;
}

export async function connectHostingProvider(
  provider: string,
  body: ConnectHostingBody,
): Promise<ConnectionResponse> {
  const res = await apiClient.post<ConnectionResponse>(
    `/connections/hosting/${provider}`,
    body,
  );
  return res.data;
}

export async function getConnections(): Promise<ConnectionListItem[]> {
  const res = await apiClient.get<ConnectionListItem[]>('/connections');
  return res.data;
}
