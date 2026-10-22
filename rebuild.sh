#!/bin/bash

# Rebuild and restart one or more plugins without touching the others, then restart nginx.
# Usage: ./rebuild.sh <widget> [<widget> ...]
#   e.g. ./rebuild.sh widget12
#        ./rebuild.sh widget5 plugin-widget12 site1
set -euo pipefail

# Use the Compose plugin if installed, otherwise the standalone binary
if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
else
    COMPOSE=(docker-compose)
fi

# Run compose from the repo root, wherever the script is called from
cd "$(dirname "$0")"

SERVICES=$("${COMPOSE[@]}" config --services)

if [ $# -eq 0 ]; then
    echo "Usage: ./rebuild.sh <widget> [<widget> ...]"
    echo "Services: $(echo "$SERVICES" | tr '\n' ' ')"
    exit 1
fi
TARGETS=()

for NAME in "$@"; do
    # Accept "widget12" as well as the full service name "plugin-widget12"
    if echo "$SERVICES" | grep -qx "$NAME"; then
        TARGETS+=("$NAME")
    elif echo "$SERVICES" | grep -qx "plugin-$NAME"; then
        TARGETS+=("plugin-$NAME")
    else
        echo "❌ Unknown service: $NAME"
        echo "Services: $(echo "$SERVICES" | tr '\n' ' ')"
        exit 1
    fi
done

echo "🔨 Rebuilding: ${TARGETS[*]}"
"${COMPOSE[@]}" up -d --build --no-deps "${TARGETS[@]}"

# nginx caches upstream IPs, so pick up the recreated containers
echo "🔄 Restarting main-nginx"
"${COMPOSE[@]}" restart main-nginx

echo "✅ Done"
"${COMPOSE[@]}" ps "${TARGETS[@]}" main-nginx
