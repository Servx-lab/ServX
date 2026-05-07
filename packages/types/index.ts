export type UserConnectionProvider =
	| 'Vercel'
	| 'Render'
	| 'DigitalOcean'
	| 'Railway'
	| 'Fly.io'
	| 'AWS'
	| 'Firebase'
	| 'MongoDB'
	| 'Supabase'
	| 'MySQL'
	| 'PostgreSQL'
	| 'AWS RDS'
	| 'Oracle'
	| 'Redis'
	| 'MariaDB';

export type ConnectionStatus = 'connected' | 'error' | 'pending';

export interface UserConnection {
	_id?: string;
	name: string;
	provider: UserConnectionProvider;
	encryptedConfig: string;
	isEncrypted: boolean;
	iv: string;
	isActive: boolean;
	lastTestedAt?: string | Date;
	ownerId: string;
	status: ConnectionStatus;
	createdAt?: string | Date;
	updatedAt?: string | Date;
}

export interface User {
	_id?: string;
	name: string;
	id: string;
	email: string;
	githubId?: string;
	githubAccessToken?: string;
	githubRefreshToken?: string;
	githubTokenExpiry?: Date | string;
	githubInstallationTokenEncrypted?: string;
	githubInstallationTokenIv?: string;
	githubInstallationId?: string;
	githubInstallationTokenUpdatedAt?: Date | string;
	avatarUrl?: string;
	username?: string;
	surname?: string;
	emailVerified?: boolean;
	role: string;
	createdAt?: string | Date;
}


export type DatabaseType =
	| 'Firebase'
	| 'MongoDB'
	| 'Supabase'
	| 'MySQL'
	| 'PostgreSQL'
	| 'AWS'
	| 'Oracle'
	| 'Google Sheets'
	| 'Vercel';

export interface RepoSummary {
	id: number;
	name: string;
	full_name: string;
	description: string | null;
	html_url: string;
	language: string | null;
	stargazers_count: number;
	updated_at: string;
	owner: {
		login: string;
		avatar_url: string;
	};
}

export interface RepoDetails {
	id: number;
	name: string;
	full_name: string;
	private: boolean;
	html_url: string;
	description: string | null;
	created_at: string;
	updated_at: string;
	language: string | null;
	stars: number;
	forks: number;
	open_issues: number;
	owner: {
		login: string;
	};
	isOwner: boolean;
}

export interface CreateConnectionBody {
	name: string;
	provider: UserConnectionProvider;
	config: {
		serviceAccountJson?: string;
		[key: string]: unknown;
	};
}

export interface ConnectionListItem {
	_id: string;
	name: string;
	provider: UserConnectionProvider;
	createdAt: string;
	isActive: boolean;
	lastTestedAt?: string;
}

export interface ConnectionResponse {
	message: string;
	connection: {
		_id: string;
		name: string;
		provider: UserConnectionProvider;
		createdAt: string;
	};
}

export interface HostingUser {
	username: string;
	name?: string;
	email?: string;
	avatar?: string;
}

export interface HostingService {
	id: string;
	name: string;
	type: string;
	status: string;
	url?: string | null;
	updatedAt?: number | string;
}

export interface HostingDeployment {
	id: string;
	name?: string;
	url?: string | null;
	state: string;
	created?: number | string;
	commit?: string | null;
	branch?: string | null;
}

/** One row from Vercel or Render env APIs (values only when provider returns them). */
export interface HostingEnvVariable {
	key: string;
	value: string;
	target?: string;
}

export interface HostingCreds {
	token: string;
	edgeConfigId?: string;
}

export interface Project {
	id: string;
	name: string;
	provider: 'vercel' | 'render';
	status: string;
	framework: string;
}

export type HostingStatusResponse =
	| {
			connected: false;
		}
	| {
			connected: true;
			connectionId: string;
			createdAt: string;
			user?: HostingUser | null;
			services: HostingService[];
			deployments: HostingDeployment[];
			error?: string;
		};

export interface AdapterDatabase {
	name: string;
	sizeOnDisk?: number;
}

export interface AdapterTable {
	name: string;
	rowCount?: number;
	sizeBytes?: number;
	type?: string;
}

export interface DbStats {
	version?: string;
	uptime?: number;
	totalConnections?: number;
	memoryUsedBytes?: number;
	storageUsedBytes?: number;
	queryCount?: number;
	extra?: Record<string, unknown>;
}

export interface ConnectionTestResult {
	ok: boolean;
	latencyMs?: number;
	message?: string;
}
