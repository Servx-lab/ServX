#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTAINER="${SUPABASE_CONTAINER:-supabase_db_servx-local}"

echo "=========================================================="
echo "ServX Local Schema & Seed Applicator"
echo "Target Container: $CONTAINER"
echo "Repo Root:        $REPO_ROOT"
echo "=========================================================="

# Ordered list of migrations and schema files:
# 1. Tracked supabase/*.sql migrations
# 2. Docs / apps SQL files (repositories, verification handshake, access management)
# 3. local-dev/schema.sql (creates missing vault, incident, and profile tables)
# 4. apps/api/supabase-schema-update.sql (adds multi-tenant user/connection columns to incidents)
# 5. local-dev/seed.sql (idempotent demo seed data)

SQL_FILES=(
    "$REPO_ROOT/supabase/migration-supabase-profiles.sql"
    "$REPO_ROOT/supabase/migration-supabase-devices.sql"
    "$REPO_ROOT/supabase/migration-supabase-exposure.sql"
    "$REPO_ROOT/supabase/migration-supabase-auto-medic.sql"
    "$REPO_ROOT/supabase/migration-supabase-performance-indexes.sql"
    "$REPO_ROOT/docs/features/repository-control-plane/migration-supabase-repositories.sql"
    "$REPO_ROOT/apps/api/scripts/verification-handshake-migration.sql"
    "$REPO_ROOT/docs/features/access-management/migration-supabase.sql"
    "$REPO_ROOT/local-dev/schema.sql"
    "$REPO_ROOT/apps/api/supabase-schema-update.sql"
    "$REPO_ROOT/local-dev/seed.sql"
)

# Preprocessor to guarantee idempotency across repeated runs
# (handles non-idempotent CREATE POLICY, CREATE TYPE and CREATE TRIGGER)
transform_sql() {
    python3 -c "
import re, sys

content = sys.stdin.read()

# 1. Idempotent device enum
content = re.sub(
    r\"CREATE TYPE public\.device_status_type AS ENUM \([^;]+\);\",
    r\"DO \$\$ BEGIN CREATE TYPE public.device_status_type AS ENUM ('PENDING', 'APPROVED', 'DENIED'); EXCEPTION WHEN duplicate_object THEN null; END \$\$;\",
    content,
    flags=re.IGNORECASE
)

# 2. Idempotent triggers: DROP TRIGGER IF EXISTS before CREATE TRIGGER
def trigger_repl(match):
    trig = match.group(1)
    tbl = match.group(2)
    return f\"DROP TRIGGER IF EXISTS {trig} ON {tbl};\n{match.group(0)}\"

content = re.sub(
    r\"CREATE\s+TRIGGER\s+(\w+)\s+(?:BEFORE|AFTER|INSTEAD OF)\s+[^;]+?\s+ON\s+([^\s;]+)\",
    trigger_repl,
    content,
    flags=re.IGNORECASE
)

# 3. Idempotent policies: DROP POLICY IF EXISTS before CREATE POLICY
def policy_repl(match):
    pol = match.group(1)
    tbl = match.group(2)
    return f\"DROP POLICY IF EXISTS {pol} ON {tbl};\n{match.group(0)}\"

content = re.sub(
    r'CREATE\s+POLICY\s+(\"[^\"]+\"|\S+)\s+ON\s+([^\s;]+)',
    policy_repl,
    content,
    flags=re.IGNORECASE
)

# 4. pg_cron may be unavailable on plain Postgres: tolerate a failed CREATE EXTENSION
content = re.sub(
    r\"CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+pg_cron\s*;\",
    r\"DO \$\$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_cron; EXCEPTION WHEN OTHERS THEN null; END \$\$;\",
    content,
    flags=re.IGNORECASE
)

# cron.schedule() upserts by job name, so it is already safe to re-run.

sys.stdout.write(content)
"
}

for sql_file in "${SQL_FILES[@]}"; do
    if [[ ! -f "$sql_file" ]]; then
        echo "❌ ERROR: File not found: $sql_file" >&2
        exit 1
    fi

    rel_path="${sql_file#"$REPO_ROOT"/}"
    echo "▶ Applying: $rel_path"

    cat "$sql_file" \
        | transform_sql \
        | docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1

    echo "✔ Applied:  $rel_path"
done

echo "=========================================================="
echo "✅ All database schemas and seed data applied successfully!"
echo "=========================================================="
