export interface HostingProviderInfo {
	dbName: string;
	label: string;
}

export const HOSTING_PROVIDERS: Record<string, HostingProviderInfo> = {
	vercel: { dbName: 'Vercel', label: 'Vercel' },
	render: { dbName: 'Render', label: 'Render' },
	railway: { dbName: 'Railway', label: 'Railway' },
	digitalocean: { dbName: 'DigitalOcean', label: 'DigitalOcean' },
	fly: { dbName: 'Fly.io', label: 'Fly.io' },
	aws: { dbName: 'AWS', label: 'AWS' },
	coolify: { dbName: 'Coolify', label: 'Coolify' },
};

export type HostingProviderKey = keyof typeof HOSTING_PROVIDERS;

export const DB_PROVIDERS = [
	'Vercel',
	'Render',
	'DigitalOcean',
	'Railway',
	'Fly.io',
	'AWS',
	'Firebase',
	'MongoDB',
	'Supabase',
	'MySQL',
	'PostgreSQL',
	'AWS RDS',
	'Oracle',
	'Redis',
	'MariaDB',
] as const;

/** Canonical frontend origin. Use this everywhere instead of repeating the env fallback. */
export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

/** Vercel OAuth callback URI */
export const VERCEL_REDIRECT_URI =
	process.env.VERCEL_REDIRECT_URI ?? 'http://localhost:5000/api/oauth/vercel/callback';

/** DigitalOcean OAuth callback URI */
export const DO_REDIRECT_URI =
	process.env.DO_REDIRECT_URI ?? 'http://localhost:5000/api/oauth/digitalocean/callback';
