#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
    echo "Usage: $0 [api|web|seed]"
    echo ""
    echo "Commands:"
    echo "  api   Start backend API server with local-dev/api.env"
    echo "  web   Start frontend Vite dev server with local-dev/web.env"
    echo "  seed  Apply PostgreSQL migrations, schema, and seed both Postgres & MongoDB"
    exit 1
}

if [[ $# -lt 1 ]]; then
    usage
fi

COMMAND="$1"
cd "$REPO_ROOT"

case "$COMMAND" in
    api)
        echo "🚀 Starting ServX API with local environment..."
        set -a
        # shellcheck disable=SC1091
        source "$SCRIPT_DIR/api.env"
        set +a
        exec npm run dev:api
        ;;
    web)
        echo "🌐 Starting ServX Web with local environment..."
        set -a
        # shellcheck disable=SC1091
        source "$SCRIPT_DIR/web.env"
        set +a
        exec npm run dev:web
        ;;
    seed)
        echo "🌱 Applying schema and seeding local databases..."
        set -a
        # shellcheck disable=SC1091
        source "$SCRIPT_DIR/api.env"
        set +a
        bash "$SCRIPT_DIR/apply-schema.sh"
        node "$REPO_ROOT/apps/api/scripts/seed-demo-mongo.js"
        echo "🎉 All local databases are seeded and ready!"
        ;;
    *)
        echo "❌ Unknown command: $COMMAND" >&2
        usage
        ;;
esac
