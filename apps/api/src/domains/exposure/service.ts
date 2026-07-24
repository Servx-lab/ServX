import { promises as dns } from 'dns';

import axios from 'axios';

import { decrypt } from '@servx/crypto';
import { HOSTING_PROVIDERS } from '@servx/config';
import type { HostingProviderKey } from '@servx/config';

import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { auditEmitter } from '../operations/auditEmitter';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExposureSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type ExposureCategory = 'network' | 'cloud_storage' | 'dns' | 'iam' | 'web_headers';
export type ExposureAssetType = 'DOMAIN' | 'SUBDOMAIN' | 'IP' | 'BUCKET';

export interface DiscoveredAsset {
  asset_type: ExposureAssetType;
  value: string;
  source: string;
  parent_domain?: string;
  metadata?: Record<string, unknown>;
}

export interface Finding {
  asset_value: string;
  category: ExposureCategory;
  severity: ExposureSeverity;
  title: string;
  description?: string;
  remediation?: string;
  dedupe_key: string;
  metadata?: Record<string, unknown>;
}

const HTTP_TIMEOUT = 8000;
const SHODAN_API_KEY = process.env.SHODAN_API_KEY;

// Weight each severity contributes to the deducted score.
const SEVERITY_WEIGHT: Record<ExposureSeverity, number> = {
  CRITICAL: 30,
  HIGH: 18,
  MEDIUM: 8,
  LOW: 3,
  INFO: 0,
};

// Common subdomains probed during passive enumeration.
const COMMON_SUBDOMAINS = [
  'www', 'api', 'app', 'staging', 'dev', 'test', 'admin', 'mail',
  'vpn', 'db', 'database', 'gateway', 'auth', 'dashboard', 'internal',
];

// Security headers we expect on a hardened endpoint.
const REQUIRED_HEADERS: { header: string; label: string; severity: ExposureSeverity }[] = [
  { header: 'strict-transport-security', label: 'Strict-Transport-Security (HSTS)', severity: 'HIGH' },
  { header: 'content-security-policy', label: 'Content-Security-Policy (CSP)', severity: 'MEDIUM' },
  { header: 'x-frame-options', label: 'X-Frame-Options', severity: 'MEDIUM' },
  { header: 'x-content-type-options', label: 'X-Content-Type-Options', severity: 'LOW' },
  { header: 'referrer-policy', label: 'Referrer-Policy', severity: 'LOW' },
];

// ─── Asset discovery ───────────────────────────────────────────────────────────

/**
 * Enumerates DNS records and probes common subdomains for a root domain.
 * Uses only passive DNS resolution (no intrusive scanning).
 */
export async function enumerateDns(domain: string): Promise<DiscoveredAsset[]> {
  const assets: DiscoveredAsset[] = [];
  const seen = new Set<string>();

  const push = (asset: DiscoveredAsset) => {
    const key = `${asset.asset_type}:${asset.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    assets.push(asset);
  };

  // Root domain A/AAAA
  try {
    const addresses = await dns.resolve(domain, 'A').catch(() => [] as string[]);
    push({ asset_type: 'DOMAIN', value: domain, source: 'dns', parent_domain: domain });
    for (const ip of addresses) {
      push({ asset_type: 'IP', value: ip, source: 'dns', parent_domain: domain, metadata: { record: 'A' } });
    }
  } catch (err: any) {
    console.warn(`[Exposure] DNS resolve failed for ${domain}:`, err.message);
  }

  // MX / TXT / NS records (informational surface)
  const [mx, txt, ns] = await Promise.all([
    dns.resolveMx(domain).catch(() => []),
    dns.resolveTxt(domain).catch(() => []),
    dns.resolveNs(domain).catch(() => []),
  ]);
  if (mx.length) push({ asset_type: 'DOMAIN', value: domain, source: 'dns', metadata: { mx } });

  // Probe common subdomains
  await Promise.all(
    COMMON_SUBDOMAINS.map(async (sub) => {
      const fqdn = `${sub}.${domain}`;
      try {
        const addrs = await dns.resolve(fqdn, 'A');
        if (addrs.length > 0) {
          push({ asset_type: 'SUBDOMAIN', value: fqdn, source: 'dns', parent_domain: domain });
          for (const ip of addrs) {
            push({ asset_type: 'IP', value: ip, source: 'dns', parent_domain: domain, metadata: { subdomain: fqdn } });
          }
        }
      } catch {
        // NXDOMAIN — subdomain does not exist, skip silently
      }
    })
  );

  return assets;
}

/**
 * Discovers cloud-hosted assets by reusing the user's encrypted hosting_vault tokens.
 * Currently supports Vercel domains and DigitalOcean droplet IPs.
 */
export async function discoverCloudAssets(userId: string): Promise<DiscoveredAsset[]> {
  const assets: DiscoveredAsset[] = [];

  const { data: connections, error } = await supabaseAdmin
    .from('hosting_vault')
    .select('id, provider, encrypted_config, iv')
    .eq('user_id', userId);

  if (error || !connections?.length) return assets;

  for (const conn of connections) {
    try {
      let rawConfig = conn.encrypted_config;
      if (conn.iv && conn.iv !== '') {
        rawConfig = decrypt({ iv: conn.iv, content: conn.encrypted_config });
      }
      const parsed = JSON.parse(rawConfig) as { token?: string; apiKey?: string };
      const token = parsed.token ?? parsed.apiKey;
      if (!token) continue;

      const providerKey = (Object.keys(HOSTING_PROVIDERS) as HostingProviderKey[]).find(
        (k) => HOSTING_PROVIDERS[k].dbName === conn.provider
      );

      if (providerKey === 'vercel') {
        const res = await axios
          .get('https://api.vercel.com/v5/domains?limit=50', {
            headers: { Authorization: `Bearer ${token}` },
            timeout: HTTP_TIMEOUT,
          })
          .catch(() => null);
        for (const d of res?.data?.domains ?? []) {
          if (d?.name) assets.push({ asset_type: 'DOMAIN', value: d.name, source: 'vercel', parent_domain: d.name });
        }
      } else if (providerKey === 'digitalocean') {
        const res = await axios
          .get('https://api.digitalocean.com/v2/droplets?per_page=100', {
            headers: { Authorization: `Bearer ${token}` },
            timeout: HTTP_TIMEOUT,
          })
          .catch(() => null);
        for (const droplet of res?.data?.droplets ?? []) {
          const v4 = droplet?.networks?.v4 ?? [];
          for (const net of v4) {
            if (net?.type === 'public' && net?.ip_address) {
              assets.push({
                asset_type: 'IP',
                value: net.ip_address,
                source: 'digitalocean',
                metadata: { droplet: droplet.name },
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Exposure] Cloud discovery failed for connection ${conn.id}:`, err.message);
    }
  }

  return assets;
}

// ─── Passive scanning ───────────────────────────────────────────────────────────

/**
 * Checks a domain/subdomain for missing security headers (free, no API key).
 */
export async function checkSecurityHeaders(host: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const url = host.startsWith('http') ? host : `https://${host}`;

  let headers: Record<string, string> = {};
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(HTTP_TIMEOUT) });
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
  } catch (err: any) {
    console.warn(`[Exposure] Header check failed for ${url}:`, err.message);
    return findings;
  }

  for (const { header, label, severity } of REQUIRED_HEADERS) {
    if (!headers[header]) {
      findings.push({
        asset_value: host,
        category: 'web_headers',
        severity,
        title: `Missing ${label} header`,
        description: `${host} does not return the ${label} response header, weakening browser-side protections.`,
        remediation: `Add the ${label} header at the edge (hosting provider config or reverse proxy).`,
        dedupe_key: `header:${host}:${header}`,
      });
    }
  }

  return findings;
}

/**
 * Queries the Shodan REST API for open ports on an IP.
 * Requires SHODAN_API_KEY; returns [] gracefully if unset.
 */
export async function scanPortsShodan(ip: string): Promise<Finding[]> {
  if (!SHODAN_API_KEY) return [];

  const findings: Finding[] = [];
  try {
    const res = await axios.get(`https://api.shodan.io/shodan/host/${ip}`, {
      params: { key: SHODAN_API_KEY },
      timeout: HTTP_TIMEOUT,
    });

    const ports: number[] = res.data?.ports ?? [];
    const services: any[] = res.data?.data ?? [];

    for (const port of ports) {
      const svc = services.find((s) => s.port === port);
      const product = svc?.product || svc?._shodan?.module || 'service';
      const sensitive = SENSITIVE_PORTS[port];
      findings.push({
        asset_value: ip,
        category: 'network',
        severity: sensitive ? 'CRITICAL' : 'MEDIUM',
        title: sensitive
          ? `Port ${port} (${sensitive}) exposed to 0.0.0.0/0`
          : `Open port ${port} (${product})`,
        description: `Shodan reports port ${port} publicly reachable on ${ip}.`,
        remediation: sensitive
          ? `Restrict port ${port} to a private network / VPC or firewall it to trusted IPs.`
          : `Confirm port ${port} must be public; otherwise firewall it.`,
        dedupe_key: `port:${ip}:${port}`,
        metadata: { product },
      });
    }
  } catch (err: any) {
    // 404 => host not in Shodan (no data); anything else is a soft failure
    if (err.response?.status !== 404) {
      console.warn(`[Exposure] Shodan lookup failed for ${ip}:`, err.message);
    }
  }

  return findings;
}

const SENSITIVE_PORTS: Record<number, string> = {
  22: 'SSH',
  23: 'Telnet',
  3306: 'MySQL',
  5432: 'PostgreSQL',
  6379: 'Redis',
  27017: 'MongoDB',
  9200: 'Elasticsearch',
  5900: 'VNC',
  3389: 'RDP',
};

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface ExposureScore {
  score: number;
  grade: string;
  status: string;
  breakdown: Record<ExposureCategory, number>;
}

/**
 * Computes a 0-100 exposure score, letter grade, and per-category health (higher = safer).
 */
export function computeExposureScore(findings: Finding[]): ExposureScore {
  const categories: ExposureCategory[] = ['network', 'cloud_storage', 'dns', 'iam', 'web_headers'];
  const breakdown: Record<ExposureCategory, number> = {
    network: 100, cloud_storage: 100, dns: 100, iam: 100, web_headers: 100,
  };

  let totalPenalty = 0;
  for (const f of findings) {
    if (f.severity === 'INFO') continue;
    const weight = SEVERITY_WEIGHT[f.severity];
    totalPenalty += weight;
    breakdown[f.category] = Math.max(0, breakdown[f.category] - weight);
  }

  const score = Math.max(0, Math.min(100, 100 - totalPenalty));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 55 ? 'D' : 'F';
  const status =
    score >= 90 ? 'Secure' : score >= 70 ? 'Elevated Risk' : score >= 55 ? 'High Risk' : 'Critical Exposure';

  categories.forEach((c) => { breakdown[c] = Math.round(breakdown[c]); });
  return { score, grade, status, breakdown };
}

// ─── Persistence ─────────────────────────────────────────────────────────────

async function persistAssets(userId: string, assets: DiscoveredAsset[]): Promise<void> {
  if (!assets.length) return;
  const rows = assets.map((a) => ({
    user_id: userId,
    asset_type: a.asset_type,
    value: a.value,
    source: a.source,
    parent_domain: a.parent_domain ?? null,
    metadata: a.metadata ?? {},
    last_scanned_at: new Date().toISOString(),
  }));
  const { error } = await supabaseAdmin
    .from('exposure_assets')
    .upsert(rows, { onConflict: 'user_id,asset_type,value' });
  if (error) console.error('[Exposure] Failed to persist assets:', error.message);
}

async function persistFindings(userId: string, findings: Finding[]): Promise<number> {
  if (!findings.length) return 0;
  const rows = findings.map((f) => ({
    user_id: userId,
    asset_value: f.asset_value,
    category: f.category,
    severity: f.severity,
    title: f.title,
    description: f.description ?? null,
    remediation: f.remediation ?? null,
    dedupe_key: f.dedupe_key,
    metadata: f.metadata ?? {},
    resolved: false,
  }));
  const { data, error } = await supabaseAdmin
    .from('exposure_findings')
    .upsert(rows, { onConflict: 'user_id,dedupe_key' })
    .select('id');
  if (error) {
    console.error('[Exposure] Failed to persist findings:', error.message);
    return 0;
  }
  return data?.length ?? 0;
}

// ─── Orchestration ─────────────────────────────────────────────────────────────

export interface ScanResult {
  assets: number;
  findings: number;
  score: ExposureScore;
}

/**
 * Runs a full perimeter scan for a user against a root domain:
 * DNS enumeration + cloud discovery -> header checks + Shodan port scan -> persist + score.
 */
export async function runScan(userId: string, userEmail: string, domain: string): Promise<ScanResult> {
  console.log(`[Exposure] Scan started for ${userId} on ${domain}`);
  auditEmitter.log(userEmail, 'security', `🛰️ Exposure scan started for ${domain}`);

  // Phase 2: discovery
  const [dnsAssets, cloudAssets] = await Promise.all([
    enumerateDns(domain),
    discoverCloudAssets(userId),
  ]);
  const assets = [...dnsAssets, ...cloudAssets];
  await persistAssets(userId, assets);

  // Phase 3: passive scanning
  const hostTargets = assets
    .filter((a) => a.asset_type === 'DOMAIN' || a.asset_type === 'SUBDOMAIN')
    .map((a) => a.value);
  const ipTargets = assets.filter((a) => a.asset_type === 'IP').map((a) => a.value);

  const headerResults = await Promise.all(hostTargets.map((h) => checkSecurityHeaders(h)));
  const portResults = await Promise.all(ipTargets.map((ip) => scanPortsShodan(ip)));
  const findings = [...headerResults.flat(), ...portResults.flat()];

  const newFindings = await persistFindings(userId, findings);
  const score = computeExposureScore(findings);

  auditEmitter.log(
    userEmail,
    'security',
    `🛰️ Exposure scan complete for ${domain}: score ${score.score} (${score.grade}), ${findings.length} findings`
  );
  console.log(`[Exposure] Scan complete for ${domain}: ${assets.length} assets, ${findings.length} findings`);

  return { assets: assets.length, findings: newFindings, score };
}

/**
 * Returns the aggregated exposure summary (score + counts) for the dashboard overview cards.
 */
export async function getExposureSummary(userId: string) {
  const [{ data: assets }, { data: findings }] = await Promise.all([
    supabaseAdmin.from('exposure_assets').select('asset_type').eq('user_id', userId),
    supabaseAdmin.from('exposure_findings').select('*').eq('user_id', userId).eq('resolved', false),
  ]);

  const findingsList: Finding[] = (findings || []).map((f: any) => ({
    asset_value: f.asset_value,
    category: f.category,
    severity: f.severity,
    title: f.title,
    dedupe_key: f.dedupe_key,
  }));

  const score = computeExposureScore(findingsList);
  const assetList = assets || [];

  const criticalFindings = (findings || []).filter(
    (f: any) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
  ).length;

  return {
    score,
    assets: {
      total: assetList.length,
      domains: assetList.filter((a: any) => a.asset_type === 'DOMAIN' || a.asset_type === 'SUBDOMAIN').length,
      ips: assetList.filter((a: any) => a.asset_type === 'IP').length,
      buckets: assetList.filter((a: any) => a.asset_type === 'BUCKET').length,
    },
    criticalFindings,
  };
}

export async function getFindings(userId: string, category?: string) {
  let query = supabaseAdmin
    .from('exposure_findings')
    .select('*')
    .eq('user_id', userId)
    .eq('resolved', false)
    .order('severity', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(100);

  if (category && category !== 'all') {
    if (category === 'open_ports') query = query.eq('category', 'network');
    else if (category === 'missing_headers') query = query.eq('category', 'web_headers');
    else if (category === 'critical') query = query.in('severity', ['CRITICAL', 'HIGH']);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Exposure] Failed to fetch findings:', error.message);
    throw error;
  }
  return data || [];
}

export async function getAssets(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('exposure_assets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addManualAsset(userId: string, assetType: ExposureAssetType, value: string) {
  const { data, error } = await supabaseAdmin
    .from('exposure_assets')
    .upsert(
      { user_id: userId, asset_type: assetType, value, source: 'manual', metadata: {} },
      { onConflict: 'user_id,asset_type,value' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
