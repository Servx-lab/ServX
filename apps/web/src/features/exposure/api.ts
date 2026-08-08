import apiClient from '@/lib/apiClient';

export interface ExposureScore {
  score: number;
  grade: string;
  status: string;
  breakdown: {
    network: number;
    cloud_storage: number;
    dns: number;
    iam: number;
    web_headers: number;
  };
}

export interface ExposureSummary {
  score: ExposureScore;
  assets: {
    total: number;
    domains: number;
    ips: number;
    buckets: number;
  };
  criticalFindings: number;
}

export interface Finding {
  id: string;
  user_id: string;
  asset_value: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  remediation: string;
  dedupe_key: string;
  resolved: boolean;
  metadata?: any;
  created_at: string;
}

export interface Asset {
  id: string;
  asset_type: 'DOMAIN' | 'SUBDOMAIN' | 'IP' | 'BUCKET';
  value: string;
  source: string;
  parent_domain?: string;
  metadata?: any;
  last_scanned_at: string;
  created_at: string;
}

export interface ScanResult {
  assets: number;
  findings: number;
  score: ExposureScore;
}

export async function getExposureSummary(): Promise<ExposureSummary> {
  const { data } = await apiClient.get<ExposureSummary>('/exposure/summary');
  return data;
}

export async function getExposureFindings(category?: string): Promise<Finding[]> {
  const params = category ? { category } : undefined;
  const { data } = await apiClient.get<Finding[]>('/exposure/findings', { params });
  return data;
}

export async function getExposureAssets(): Promise<Asset[]> {
  const { data } = await apiClient.get<Asset[]>('/exposure/assets');
  return data;
}

export async function runManualScan(domain: string): Promise<ScanResult> {
  const { data } = await apiClient.post<ScanResult>('/exposure/scan', { domain });
  return data;
}

export async function addManualAsset(asset_type: string, value: string): Promise<Asset> {
  const { data } = await apiClient.post<Asset>('/exposure/assets', { asset_type, value });
  return data;
}
