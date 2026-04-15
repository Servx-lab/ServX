/** Provider slug strings — mirrors HOSTING_PROVIDERS keys from @servx/config */
export type HostingProviderKey = 'vercel' | 'render' | 'railway' | 'digitalocean' | 'fly' | 'aws';

export interface HostingService {
  id: string;
  name: string;
  type: string;
  status: string;
  url: string | null;
  updatedAt: number;
}

export interface HostingDeployment {
  id: string;
  name: string;
  url: string | null;
  state: string;
  created: number;
  commit: string | null;
  branch: string | null;
}

export interface HostingUser {
  username: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface HostingStatusResponse {
  connected: boolean;
  connectionId?: string;
  createdAt?: string;
  user?: HostingUser;
  services: HostingService[];
  deployments: HostingDeployment[];
  error?: string;
}

export interface ConnectHostingBody {
  name: string;
  token: string;
  edgeConfigId?: string;
}

export interface HostingEnvVariable {
  key: string;
  value: string;
  target?: string;
}

export interface ConnectionResponse {
  id: string;
  name: string;
  provider: string;
  createdAt: string;
}

export interface ConnectionListItem {
  id: string;
  name: string;
  provider: string;
  type: string;
  createdAt: string;
}
