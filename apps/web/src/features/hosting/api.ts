import apiClient from '@/lib/apiClient';
import type {
  ConnectHostingBody,
  ConnectionListItem,
  ConnectionResponse,
  HostingEnvVariable,
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

/** Load env vars for a Vercel project or Render service (server uses stored encrypted API token). */
export async function fetchHostingEnvVariables(
  provider: string,
  serviceId: string,
): Promise<HostingEnvVariable[]> {
  const res = await apiClient.get<{ variables: HostingEnvVariable[] }>(
    `/connections/hosting/${encodeURIComponent(provider)}/env/${encodeURIComponent(serviceId)}`,
  );
  return res.data.variables ?? [];
}
