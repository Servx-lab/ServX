-- local-dev/seed.sql
-- Idempotent local demo seed for ServX console
-- Persona: Alex Rivera (alex@servx.dev), Teammates: Priya Nair (priya@servx.dev), Sam Okafor (sam@servx.dev)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. Auth Users ────────────────────────────────────────────────────────────
-- Password for all demo accounts: ServXDemo#2026
-- Fixed UUIDs ensure reproducible relationships across tables and MongoDB.

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    is_anonymous
) VALUES
(
    '00000000-0000-0000-0000-000000000000',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'authenticated',
    'authenticated',
    'alex@servx.dev',
    crypt('ServXDemo#2026', gen_salt('bf')),
    now() - interval '30 days',
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now(),
    '{"provider": "email", "providers": ["email", "github"]}'::jsonb,
    '{"full_name": "Alex Rivera", "name": "Alex Rivera", "displayName": "Alex Rivera", "avatar_url": "https://api.dicebear.com/9.x/initials/svg?seed=Alex%20Rivera&backgroundColor=0d9488"}'::jsonb,
    false,
    now() - interval '30 days',
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
),
(
    '00000000-0000-0000-0000-000000000000',
    'a2b3c4d5-2222-4444-8888-111122223333',
    'authenticated',
    'authenticated',
    'priya@servx.dev',
    crypt('ServXDemo#2026', gen_salt('bf')),
    now() - interval '20 days',
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now() - interval '2 days',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Priya Nair", "name": "Priya Nair", "displayName": "Priya Nair", "avatar_url": "https://api.dicebear.com/9.x/initials/svg?seed=Priya%20Nair&backgroundColor=7c3aed"}'::jsonb,
    false,
    now() - interval '20 days',
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
),
(
    '00000000-0000-0000-0000-000000000000',
    'b3c4d5e6-3333-5555-9999-222233334444',
    'authenticated',
    'authenticated',
    'sam@servx.dev',
    crypt('ServXDemo#2026', gen_salt('bf')),
    now() - interval '10 days',
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now() - interval '1 day',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Sam Okafor", "name": "Sam Okafor", "displayName": "Sam Okafor", "avatar_url": "https://api.dicebear.com/9.x/initials/svg?seed=Sam%20Okafor&backgroundColor=ea580c"}'::jsonb,
    false,
    now() - interval '10 days',
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    updated_at = now();

-- ─── 2. Auth Identities ───────────────────────────────────────────────────────
-- RequireAuth checks session.user.identities for provider = 'github'.
-- Safely refresh identities for demo users.
DELETE FROM auth.identities 
WHERE user_id IN (
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'a2b3c4d5-2222-4444-8888-111122223333',
    'b3c4d5e6-3333-5555-9999-222233334444'
);

INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES
(
    '1d111111-1111-4111-8111-111111111111',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '{"sub": "8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11", "email": "alex@servx.dev", "email_verified": true}'::jsonb,
    'email',
    now(),
    now() - interval '30 days',
    now()
),
(
    '1d111111-1111-4111-8111-111111111112',
    '12345678',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '{"sub": "12345678", "email": "alex@servx.dev", "user_name": "alexrivera", "name": "Alex Rivera", "avatar_url": "https://api.dicebear.com/9.x/initials/svg?seed=Alex%20Rivera&backgroundColor=0d9488"}'::jsonb,
    'github',
    now(),
    now() - interval '30 days',
    now()
),
(
    '1d222222-2222-4222-8222-222222222222',
    'a2b3c4d5-2222-4444-8888-111122223333',
    'a2b3c4d5-2222-4444-8888-111122223333',
    '{"sub": "a2b3c4d5-2222-4444-8888-111122223333", "email": "priya@servx.dev", "email_verified": true}'::jsonb,
    'email',
    now() - interval '2 days',
    now() - interval '20 days',
    now()
),
(
    '1d333333-3333-4333-8333-333333333333',
    'b3c4d5e6-3333-5555-9999-222233334444',
    'b3c4d5e6-3333-5555-9999-222233334444',
    '{"sub": "b3c4d5e6-3333-5555-9999-222233334444", "email": "sam@servx.dev", "email_verified": true}'::jsonb,
    'email',
    now() - interval '1 day',
    now() - interval '10 days',
    now()
);

-- ─── 3. user_profiles ─────────────────────────────────────────────────────────
INSERT INTO public.user_profiles (id, email, display_name, avatar_url, updated_at)
VALUES
(
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'alex@servx.dev',
    'Alex Rivera',
    'https://api.dicebear.com/9.x/initials/svg?seed=Alex%20Rivera&backgroundColor=0d9488',
    now()
),
(
    'a2b3c4d5-2222-4444-8888-111122223333',
    'priya@servx.dev',
    'Priya Nair',
    'https://api.dicebear.com/9.x/initials/svg?seed=Priya%20Nair&backgroundColor=7c3aed',
    now()
),
(
    'b3c4d5e6-3333-5555-9999-222233334444',
    'sam@servx.dev',
    'Sam Okafor',
    'https://api.dicebear.com/9.x/initials/svg?seed=Sam%20Okafor&backgroundColor=ea580c',
    now()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

-- Also ensure public.profiles has matching records
INSERT INTO public.profiles (id, full_name, linkedin, github, updated_at)
VALUES
(
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'Alex Rivera',
    'https://linkedin.com/in/alex-rivera-servx',
    'https://github.com/alexrivera',
    now()
),
(
    'a2b3c4d5-2222-4444-8888-111122223333',
    'Priya Nair',
    'https://linkedin.com/in/priya-nair',
    'https://github.com/priyanair',
    now()
),
(
    'b3c4d5e6-3333-5555-9999-222233334444',
    'Sam Okafor',
    'https://linkedin.com/in/sam-okafor',
    'https://github.com/samokafor',
    now()
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    linkedin = EXCLUDED.linkedin,
    github = EXCLUDED.github,
    updated_at = now();

-- ─── 4. github_vault ──────────────────────────────────────────────────────────
-- Alex Rivera's GitHub connection (iv='' denotes plaintext token format)
INSERT INTO public.github_vault (
    user_id,
    github_id,
    github_username,
    encrypted_access_token,
    encrypted_refresh_token,
    iv,
    token_expiry,
    installation_id,
    status,
    updated_at
) VALUES (
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '12345678',
    'alexrivera',
    'ghp_demo_alex_rivera_token_for_local_dev',
    NULL,
    '',
    now() + interval '1 year',
    'inst_demo_98765',
    'connected',
    now()
)
ON CONFLICT (user_id) DO UPDATE SET
    github_id = EXCLUDED.github_id,
    github_username = EXCLUDED.github_username,
    encrypted_access_token = EXCLUDED.encrypted_access_token,
    iv = '',
    token_expiry = EXCLUDED.token_expiry,
    status = 'connected',
    updated_at = now();

-- ─── 5. user_devices ──────────────────────────────────────────────────────────
-- Fingerprint servx-demo-device-01 matches the browser fingerprint
INSERT INTO public.user_devices (
    id,
    user_uuid,
    device_fingerprint,
    device_name,
    is_main_device,
    status,
    last_ip,
    last_login,
    updated_at
) VALUES
(
    'd1111111-1111-1111-1111-111111111111',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'servx-demo-device-01',
    'Chrome on Linux',
    true,
    'APPROVED',
    '127.0.0.1',
    now() - interval '5 minutes',
    now()
),
(
    'd2222222-2222-2222-2222-222222222222',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'servx-demo-device-02',
    'Safari on macOS',
    false,
    'APPROVED',
    '192.168.1.42',
    now() - interval '1 day',
    now()
),
(
    'd3333333-3333-3333-3333-333333333333',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'servx-demo-device-03',
    'Chrome on Android',
    false,
    'PENDING',
    '10.0.0.15',
    now() - interval '3 hours',
    now()
)
ON CONFLICT (user_uuid, device_fingerprint) DO UPDATE SET
    device_name = EXCLUDED.device_name,
    is_main_device = EXCLUDED.is_main_device,
    status = EXCLUDED.status,
    last_ip = EXCLUDED.last_ip,
    last_login = EXCLUDED.last_login,
    updated_at = now();

-- ─── 6. servx_repositories ────────────────────────────────────────────────────
-- 3 Repositories for Alex Rivera, including svx_test_pin_123
INSERT INTO public.servx_repositories (
    user_uuid,
    github_repo_id,
    github_repo_full_name,
    servx_pin,
    is_maintenance,
    verification_status,
    framework_meta,
    updated_at
) VALUES
(
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '100000001',
    'servx-lab/servx-web',
    'svx_test_pin_123',
    false,
    'VERIFIED',
    '{"framework": "react", "language": "TypeScript", "buildTool": "vite"}'::jsonb,
    now()
),
(
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '100000002',
    'servx-lab/checkout-api',
    'svx_pin_checkout_api_456',
    false,
    'VERIFIED',
    '{"framework": "express", "language": "TypeScript", "runtime": "nodejs"}'::jsonb,
    now()
),
(
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '100000003',
    'servx-lab/status-page',
    'svx_pin_status_page_789',
    false,
    'VERIFIED',
    '{"framework": "nextjs", "language": "TypeScript", "deployment": "edge"}'::jsonb,
    now()
)
ON CONFLICT (servx_pin) DO UPDATE SET
    github_repo_full_name = EXCLUDED.github_repo_full_name,
    is_maintenance = false,
    verification_status = 'VERIFIED',
    framework_meta = EXCLUDED.framework_meta,
    updated_at = now();

-- ─── 7. hosting_vault ─────────────────────────────────────────────────────────
-- Vercel Personal & Render Production connections
INSERT INTO public.hosting_vault (
    id,
    user_id,
    name,
    alias,
    provider,
    encrypted_config,
    iv,
    avatar_url,
    updated_at
) VALUES
(
    '0f8fad5b-d9cb-469f-a165-70867728950e',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'alex-vercel',
    'Personal',
    'Vercel',
    '{"token":"vercel_demo_token_alex_2026","apiKey":"vercel_demo_token_alex_2026"}',
    '',
    'https://api.dicebear.com/9.x/initials/svg?seed=Vercel&backgroundColor=111111',
    now()
),
(
    '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'render-prod',
    'Production',
    'Render',
    '{"token":"render_demo_token_alex_2026","apiKey":"render_demo_token_alex_2026"}',
    '',
    'https://api.dicebear.com/9.x/initials/svg?seed=Render&backgroundColor=4f46e5',
    now()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    alias = EXCLUDED.alias,
    provider = EXCLUDED.provider,
    encrypted_config = EXCLUDED.encrypted_config,
    iv = '',
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

-- ─── 8. db_vault ──────────────────────────────────────────────────────────────
-- shop-mongo points to local Mongo db servx_demo_shop (seeded by seed-demo-mongo.js)
-- billing-postgres points to local Supabase Postgres instance
INSERT INTO public.db_vault (
    id,
    user_id,
    name,
    provider,
    encrypted_config,
    iv,
    status,
    updated_at
) VALUES
(
    '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'shop-mongo',
    'MongoDB',
    '{"connectionUri":"mongodb://127.0.0.1:27019/servx_demo_shop"}',
    '',
    'connected',
    now()
),
(
    '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'billing-postgres',
    'PostgreSQL',
    '{"connectionUri":"postgresql://postgres:postgres@127.0.0.1:55422/postgres"}',
    '',
    'connected',
    now()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    provider = EXCLUDED.provider,
    encrypted_config = EXCLUDED.encrypted_config,
    iv = '',
    status = EXCLUDED.status,
    updated_at = now();

-- ─── 9. incidents & error_cache ───────────────────────────────────────────────
-- Realistic Auto-Medic incidents over the last 3 days
INSERT INTO public.incidents (
    id,
    timestamp,
    method,
    path,
    error_message,
    error_stack,
    error_code,
    diagnosis,
    suggested_fix,
    severity,
    cached,
    user_id,
    connection_id,
    updated_at
) VALUES
(
    'DEP-0f8fad5b-d9cb-469f-a165-70867728950e-dpl_vcl_auth991',
    now() - interval '2 hours',
    'DEPLOY',
    'vercel - servx-web',
    'Deployment failed: Missing required environment variable NEXT_PUBLIC_AUTH_DOMAIN',
    'Error: NEXT_PUBLIC_AUTH_DOMAIN is not defined at validateEnv (src/env.mjs:14:11) at build (next/dist/build/index.js:42:15)',
    500,
    'Production build failed during static validation because NEXT_PUBLIC_AUTH_DOMAIN was omitted from the Vercel project environment configuration.',
    'Add NEXT_PUBLIC_AUTH_DOMAIN to Environment Variables in Vercel Project Settings and trigger a redeploy.',
    'critical',
    true,
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '0f8fad5b-d9cb-469f-a165-70867728950e',
    now()
),
(
    'DEP-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d-dpl_rnd_prisma442',
    now() - interval '18 hours',
    'DEPLOY',
    'render - checkout-api',
    'Migration failed: P3006 Migration 20261021_add_billing failed to apply cleanly to target database',
    'PrismaClientInitializationError: Failed to apply migration: relation "billing_accounts" already exists at MigrationEngine.applyMigrations',
    500,
    'Prisma migration halted due to a drift collision: the table "billing_accounts" was created manually in staging before baseline synchronization.',
    'Mark migration as resolved using "prisma migrate resolve --applied 20261021_add_billing" or sync shadow database baseline.',
    'high',
    true,
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    now()
),
(
    'DEP-1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d-dpl_rnd_oom818',
    now() - interval '1 day 4 hours',
    'DEPLOY',
    'render - checkout-api',
    'Container killed: Out of Memory (OOMKilled, exit code 137)',
    'FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory',
    500,
    'Node.js heap exhausted during heavy JSON schema compilation on the Starter instance plan (limit 512MB RAM).',
    'Upgrade service instance type to Standard (2GB RAM) or set NODE_OPTIONS="--max-old-space-size=1536" in Render environment.',
    'critical',
    false,
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    now()
),
(
    'DEP-0f8fad5b-d9cb-469f-a165-70867728950e-dpl_vcl_edge553',
    now() - interval '2 days 6 hours',
    'DEPLOY',
    'vercel - status-page',
    'Edge Function exceeded execution time limit: 50ms',
    'EdgeFunctionInvocationError: Execution reached maximum CPU wall clock duration at evaluateStatusRule (edge/middleware.ts:33)',
    504,
    'Middleware regex loop caused high latency exceeding the Vercel Hobby Edge Function CPU budget limit.',
    'Refactor regex parsing to use compiled trie search and move telemetry payload dispatch to waitUntil().',
    'medium',
    true,
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '0f8fad5b-d9cb-469f-a165-70867728950e',
    now()
),
(
    'DEP-0f8fad5b-d9cb-469f-a165-70867728950e-dpl_vcl_dep771',
    now() - interval '2 days 18 hours',
    'DEPLOY',
    'vercel - servx-web',
    'npm ERR! ERESOLVE could not resolve dependency: @radix-ui/react-dialog@1.1.14',
    'npm error Conflicting peer dependency: react@19.0.0 from @radix-ui/react-dialog@1.1.14',
    500,
    'Peer dependency resolution failed during package installation on Vercel build container.',
    'Set NPM_FLAGS="--legacy-peer-deps" in project build settings or pin lockfile versions.',
    'high',
    false,
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    '0f8fad5b-d9cb-469f-a165-70867728950e',
    now()
)
ON CONFLICT (id) DO UPDATE SET
    timestamp = EXCLUDED.timestamp,
    error_message = EXCLUDED.error_message,
    error_stack = EXCLUDED.error_stack,
    diagnosis = EXCLUDED.diagnosis,
    suggested_fix = EXCLUDED.suggested_fix,
    severity = EXCLUDED.severity,
    cached = EXCLUDED.cached,
    updated_at = now();

-- Matching error_cache rows
INSERT INTO public.error_cache (
    signature,
    original_error,
    diagnosis,
    suggested_fix,
    severity,
    metadata
) VALUES
(
    'sig_env_auth_domain_missing',
    'Deployment failed: Missing required environment variable NEXT_PUBLIC_AUTH_DOMAIN',
    'Production build failed during static validation because NEXT_PUBLIC_AUTH_DOMAIN was omitted from the Vercel project environment configuration.',
    'Add NEXT_PUBLIC_AUTH_DOMAIN to Environment Variables in Vercel Project Settings and trigger a redeploy.',
    'critical',
    '{"service": "vercel", "repo": "servx-lab/servx-web"}'::jsonb
),
(
    'sig_prisma_relation_collision',
    'Migration failed: P3006 Migration 20261021_add_billing failed to apply cleanly to target database',
    'Prisma migration halted due to a drift collision: the table "billing_accounts" was created manually in staging before baseline synchronization.',
    'Mark migration as resolved using "prisma migrate resolve --applied 20261021_add_billing" or sync shadow database baseline.',
    'high',
    '{"service": "render", "repo": "servx-lab/checkout-api"}'::jsonb
),
(
    'sig_edge_timeout_limit',
    'Edge Function exceeded execution time limit: 50ms',
    'Middleware regex loop caused high latency exceeding the Vercel Hobby Edge Function CPU budget limit.',
    'Refactor regex parsing to use compiled trie search and move telemetry payload dispatch to waitUntil().',
    'medium',
    '{"service": "vercel", "repo": "servx-lab/status-page"}'::jsonb
)
ON CONFLICT (signature) DO UPDATE SET
    original_error = EXCLUDED.original_error,
    diagnosis = EXCLUDED.diagnosis,
    suggested_fix = EXCLUDED.suggested_fix,
    severity = EXCLUDED.severity,
    metadata = EXCLUDED.metadata;

-- ─── 10. exposure_assets ──────────────────────────────────────────────────────
-- ~10 assets across domains, subdomains, IPs, and cloud storage
INSERT INTO public.exposure_assets (
    id,
    user_id,
    asset_type,
    value,
    source,
    parent_domain,
    metadata,
    last_scanned_at,
    updated_at
) VALUES
(
    'ea010000-0000-0000-0000-000000000001',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'DOMAIN',
    'servx-demo.dev',
    'manual',
    'servx-demo.dev',
    '{"dnsProvider": "Cloudflare", "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"]}'::jsonb,
    now() - interval '3 hours',
    now()
),
(
    'ea010000-0000-0000-0000-000000000002',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'SUBDOMAIN',
    'api.servx-demo.dev',
    'dns',
    'servx-demo.dev',
    '{"cname": "cname.vercel-dns.com", "tlsVersion": "TLSv1.3"}'::jsonb,
    now() - interval '2 hours',
    now()
),
(
    'ea010000-0000-0000-0000-000000000003',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'SUBDOMAIN',
    'auth.servx-demo.dev',
    'dns',
    'servx-demo.dev',
    '{"ip": "198.51.100.24", "tlsVersion": "TLSv1.3"}'::jsonb,
    now() - interval '4 hours',
    now()
),
(
    'ea010000-0000-0000-0000-000000000004',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'SUBDOMAIN',
    'admin.servx-demo.dev',
    'dns',
    'servx-demo.dev',
    '{"ip": "198.51.100.25", "tlsVersion": "TLSv1.3"}'::jsonb,
    now() - interval '5 hours',
    now()
),
(
    'ea010000-0000-0000-0000-000000000005',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'SUBDOMAIN',
    'checkout.servx-demo.dev',
    'dns',
    'servx-demo.dev',
    '{"cname": "checkout-api.onrender.com", "tlsVersion": "TLSv1.2"}'::jsonb,
    now() - interval '1 hour',
    now()
),
(
    'ea010000-0000-0000-0000-000000000006',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'SUBDOMAIN',
    'staging.servx-demo.dev',
    'dns',
    'servx-demo.dev',
    '{"cname": "unclaimed-staging.s3-website-us-east-1.amazonaws.com"}'::jsonb,
    now() - interval '6 hours',
    now()
),
(
    'ea010000-0000-0000-0000-000000000007',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'IP',
    '198.51.100.24',
    'dns',
    'servx-demo.dev',
    '{"asn": "AS13335 Cloudflare", "openPorts": [80, 443, 5432]}'::jsonb,
    now() - interval '2 hours',
    now()
),
(
    'ea010000-0000-0000-0000-000000000008',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'IP',
    '198.51.100.25',
    'dns',
    'servx-demo.dev',
    '{"asn": "AS13335 Cloudflare", "openPorts": [22, 80, 443]}'::jsonb,
    now() - interval '2 hours',
    now()
),
(
    'ea010000-0000-0000-0000-000000000009',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'IP',
    '203.0.113.88',
    'manual',
    'servx-demo.dev',
    '{"asn": "AS16509 Amazon", "openPorts": [23, 8080]}'::jsonb,
    now() - interval '12 hours',
    now()
),
(
    'ea010000-0000-0000-0000-000000000010',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'BUCKET',
    'servx-demo-assets-public',
    'cloud_storage',
    'servx-demo.dev',
    '{"region": "us-east-1", "access": "public-read", "provider": "AWS S3"}'::jsonb,
    now() - interval '8 hours',
    now()
)
ON CONFLICT (user_id, asset_type, value) DO UPDATE SET
    source = EXCLUDED.source,
    parent_domain = EXCLUDED.parent_domain,
    metadata = EXCLUDED.metadata,
    last_scanned_at = EXCLUDED.last_scanned_at,
    updated_at = now();

-- ─── 11. exposure_findings ────────────────────────────────────────────────────
-- 14 realistic findings across network, cloud_storage, dns, iam, web_headers
INSERT INTO public.exposure_findings (
    id,
    user_id,
    asset_id,
    asset_value,
    category,
    severity,
    title,
    description,
    remediation,
    dedupe_key,
    resolved,
    metadata,
    updated_at
) VALUES
-- Network
(
    'ef010000-0000-0000-0000-000000000001',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000007',
    '198.51.100.24',
    'network',
    'CRITICAL',
    'PostgreSQL Port (5432) Exposed to 0.0.0.0/0',
    'Direct TCP access to the primary database listening port is unshielded from public IP addresses.',
    'Bind PostgreSQL strictly to 127.0.0.1 or VPC private subnet and enforce Security Group ingress rules.',
    'net:198.51.100.24:5432',
    false,
    '{"port": 5432, "protocol": "tcp", "service": "postgresql"}'::jsonb,
    now()
),
(
    'ef010000-0000-0000-0000-000000000002',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000008',
    '198.51.100.25',
    'network',
    'HIGH',
    'SSH Daemon Allows Password Authentication on Default Port 22',
    'SSH port 22 is open with PasswordAuthentication enabled, making the host vulnerable to dictionary attacks.',
    'Configure PasswordAuthentication no in /etc/ssh/sshd_config and require hardware security keys or ed25519.',
    'net:198.51.100.25:22:password_auth',
    false,
    '{"port": 22, "protocol": "tcp", "service": "ssh"}'::jsonb,
    now()
),
(
    'ef010000-0000-0000-0000-000000000003',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000009',
    '203.0.113.88',
    'network',
    'MEDIUM',
    'Legacy Telnet Port 23 Open on Staging Host',
    'Unencrypted Telnet service detected on staging node.',
    'Disable the telnet daemon service and remove firewall forwarding rules.',
    'net:203.0.113.88:23:telnet',
    true,
    '{"port": 23, "protocol": "tcp", "service": "telnet", "resolvedBy": "alex@servx.dev"}'::jsonb,
    now()
),
-- Cloud Storage
(
    'ef010000-0000-0000-0000-000000000004',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000010',
    'servx-demo-assets-public',
    'cloud_storage',
    'CRITICAL',
    'S3 Bucket Allows Anonymous ListObjects & GetObject',
    'Bucket policy includes "Principal": "*" with "Action": "s3:ListBucket", exposing all asset keys to unauthenticated scrapers.',
    'Enable AWS S3 Block Public Access on bucket level and restrict bucket policy to CloudFront OAI/OAC.',
    'storage:servx-demo-assets-public:public_listing',
    false,
    '{"bucket": "servx-demo-assets-public", "policy": "public_list"}'::jsonb,
    now()
),
(
    'ef010000-0000-0000-0000-000000000005',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000010',
    'servx-demo-assets-public',
    'cloud_storage',
    'HIGH',
    'S3 Bucket Missing Default Server-Side KMS Encryption',
    'Bucket does not enforce default AWS-KMS or AES256 server-side encryption for objects at rest.',
    'Enable Default Encryption using aws:kms master key or AES256 server-side encryption.',
    'storage:servx-demo-assets-public:missing_sse',
    false,
    '{"bucket": "servx-demo-assets-public"}'::jsonb,
    now()
),
(
    'ef010000-0000-0000-0000-000000000006',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000010',
    'servx-demo-assets-public',
    'cloud_storage',
    'LOW',
    'Missing Lifecycle Rule to Abort Incomplete Multipart Uploads',
    'Incomplete multipart uploads persist indefinitely, causing storage leak costs.',
    'Add lifecycle configuration rule with AbortIncompleteMultipartUpload after 7 days.',
    'storage:servx-demo-assets-public:multipart_lifecycle',
    true,
    '{"bucket": "servx-demo-assets-public", "resolvedBy": "alex@servx.dev"}'::jsonb,
    now()
),
-- DNS
(
    'ef010000-0000-0000-0000-000000000007',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000006',
    'staging.servx-demo.dev',
    'dns',
    'HIGH',
    'Dangling CNAME Points to Decommissioned S3 Website (Subdomain Takeover)',
    'CNAME record points to unclaimed-staging.s3-website-us-east-1.amazonaws.com which does not resolve to an active bucket.',
    'Delete the obsolete CNAME record in DNS settings or claim the target S3 bucket name.',
    'dns:staging.servx-demo.dev:dangling_cname',
    false,
    '{"cname": "unclaimed-staging.s3-website-us-east-1.amazonaws.com"}'::jsonb,
    now()
),
(
    'ef010000-0000-0000-0000-000000000008',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000001',
    'servx-demo.dev',
    'dns',
    'MEDIUM',
    'Missing DNS CAA (Certificate Authority Authorization) Record',
    'The apex domain lacks CAA records, allowing any public Certificate Authority to issue certificates for it.',
    'Add CAA DNS records specifying authorized CAs, e.g. "0 issue letsencrypt.org".',
    'dns:servx-demo.dev:missing_caa',
    false,
    '{"domain": "servx-demo.dev"}'::jsonb,
    now()
),
(
    'ef010000-0000-0000-0000-000000000009',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000001',
    'servx-demo.dev',
    'dns',
    'LOW',
    'SPF Record Configured with SoftFail (~all) Instead of Strict (-all)',
    'SPF policy uses ~all qualifier which marks unauthorized mail as suspicious but does not instruct receivers to reject.',
    'Update SPF record from ~all to -all after verifying all legitimate sending relays.',
    'dns:servx-demo.dev:spf_softfail',
    true,
    '{"domain": "servx-demo.dev", "resolvedBy": "priya@servx.dev"}'::jsonb,
    now()
),
-- IAM
(
    'ef010000-0000-0000-0000-000000000010',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000002',
    'api.servx-demo.dev',
    'iam',
    'CRITICAL',
    'Over-Privileged AdministratorAccess Attached to API Instance Profile',
    'EC2/ECS role attached to backend API workloads contains AdministratorAccess, violating the principle of least privilege.',
    'Replace AdministratorAccess policy with scoped IAM policies granting access only to designated DynamoDB/S3/KMS resources.',
    'iam:api.servx-demo.dev:admin_policy',
    false,
    '{"role": "ServX-Backend-ServiceRole", "policy": "AdministratorAccess"}'::jsonb,
    now()
),
(
    'ef010000-0000-0000-0000-000000000011',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000003',
    'auth.servx-demo.dev',
    'iam',
    'HIGH',
    'Cloud Service Account Key Older Than 180 Days Has Not Been Rotated',
    'A long-lived AWS IAM access key associated with auth workloads was created 210 days ago without rotation.',
    'Generate a replacement access key, verify application connectivity, and deactivate the old key.',
    'iam:auth.servx-demo.dev:stale_key_180d',
    false,
    '{"keyId": "AKIAXXXXXXXXXXXXXXXX", "ageDays": 210}'::jsonb,
    now()
),
(
    'ef010000-0000-0000-0000-000000000012',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000004',
    'admin.servx-demo.dev',
    'iam',
    'MEDIUM',
    'Missing MFA Enforcement Policy for Administrative Role Escalation',
    'Administrative access to admin console API does not require Hardware/TOTP Multi-Factor Authentication token.',
    'Enforce aws:MultiFactorAuthPresent condition on IAM policies for administrative actions.',
    'iam:admin.servx-demo.dev:no_mfa_enforced',
    false,
    '{"policy": "AdminConsoleAccess"}'::jsonb,
    now()
),
-- Web Headers
(
    'ef010000-0000-0000-0000-000000000013',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000005',
    'checkout.servx-demo.dev',
    'web_headers',
    'HIGH',
    'Missing Strict-Transport-Security (HSTS) Header on Checkout Endpoint',
    'The checkout payment domain does not return Strict-Transport-Security, exposing user cookies to SSL-stripping attacks.',
    'Configure Strict-Transport-Security: max-age=31536000; includeSubDomains; preload in web server response headers.',
    'headers:checkout.servx-demo.dev:missing_hsts',
    false,
    '{"header": "Strict-Transport-Security", "url": "https://checkout.servx-demo.dev"}'::jsonb,
    now()
),
(
    'ef010000-0000-0000-0000-000000000014',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'ea010000-0000-0000-0000-000000000001',
    'servx-demo.dev',
    'web_headers',
    'MEDIUM',
    'Missing Content-Security-Policy (CSP) Header',
    'No Content-Security-Policy header returned, increasing exposure to cross-site scripting (XSS) attacks.',
    'Implement a strict Content-Security-Policy header restricting script-src, object-src, and default-src.',
    'headers:servx-demo.dev:missing_csp',
    false,
    '{"header": "Content-Security-Policy"}'::jsonb,
    now()
)
ON CONFLICT (user_id, dedupe_key) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    remediation = EXCLUDED.remediation,
    category = EXCLUDED.category,
    severity = EXCLUDED.severity,
    resolved = EXCLUDED.resolved,
    metadata = EXCLUDED.metadata,
    updated_at = now();

-- ─── 12. team_access_control ──────────────────────────────────────────────────
-- Granular permissions for Priya Nair (Editor) and Sam Okafor (Viewer)
INSERT INTO public.team_access_control (
    owner_id,
    user_id,
    permissions,
    updated_at
) VALUES
(
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'a2b3c4d5-2222-4444-8888-111122223333',
    '{
        "repos": ["100000001", "100000002"],
        "dbs": ["2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e", "7c9e6679-7425-40de-944b-e07fc1f90ae7"],
        "global": {
            "isFullControl": false,
            "canBanIPs": true,
            "canViewDeviceUUIDs": true,
            "canAccessHosting": true,
            "canAccessGithub": true,
            "canAccessDatabases": true
        },
        "granularAllow": {
            "serverIds": ["0f8fad5b-d9cb-469f-a165-70867728950e", "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"],
            "databaseIds": ["2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e", "7c9e6679-7425-40de-944b-e07fc1f90ae7"]
        }
    }'::jsonb,
    now()
),
(
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'b3c4d5e6-3333-5555-9999-222233334444',
    '{
        "repos": ["100000003"],
        "dbs": ["7c9e6679-7425-40de-944b-e07fc1f90ae7"],
        "global": {
            "isFullControl": false,
            "canBanIPs": false,
            "canViewDeviceUUIDs": false,
            "canAccessHosting": true,
            "canAccessGithub": false,
            "canAccessDatabases": true
        },
        "granularAllow": {
            "serverIds": ["0f8fad5b-d9cb-469f-a165-70867728950e"],
            "databaseIds": ["7c9e6679-7425-40de-944b-e07fc1f90ae7"]
        }
    }'::jsonb,
    now()
)
ON CONFLICT (owner_id, user_id) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    updated_at = now();

-- ─── 13. project_groups ───────────────────────────────────────────────────────
INSERT INTO public.project_groups (
    id,
    user_id,
    name,
    assets,
    updated_at
) VALUES
(
    '9a010000-0000-4000-8000-000000000001',
    '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11',
    'Core Production Perimeter',
    '[
        {"type": "repo", "id": "100000001", "name": "servx-web"},
        {"type": "repo", "id": "100000002", "name": "checkout-api"},
        {"type": "hosting", "id": "0f8fad5b-d9cb-469f-a165-70867728950e", "provider": "Vercel"},
        {"type": "hosting", "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d", "provider": "Render"},
        {"type": "db", "id": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e", "provider": "MongoDB"},
        {"type": "db", "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "provider": "PostgreSQL"}
    ]'::jsonb,
    now()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    assets = EXCLUDED.assets,
    updated_at = now();

-- Keep three findings open (one HIGH, one MEDIUM, one LOW) and the rest as remediation history,
-- so the demo score lands on a mid grade (100 - 18 - 8 - 3 = 71, C) instead of flooring at 0.
UPDATE public.exposure_findings
SET resolved = title NOT IN (
    'Missing Strict-Transport-Security (HSTS) Header on Checkout Endpoint',
    'Missing Content-Security-Policy (CSP) Header',
    'SPF Record Configured with SoftFail (~all) Instead of Strict (-all)'
)
WHERE user_id = '8f14e45f-ceea-467a-9c1e-2d3bfb4d1a11';
