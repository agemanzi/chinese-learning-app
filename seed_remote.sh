#!/bin/bash
# Upload local data files to the production container.
# Usage:
#   ./seed_remote.sh              — only uploads files missing on server
#   ./seed_remote.sh --force      — overwrites all files

set -e

SERVER_USER="root"
SERVER_HOST="46.224.104.232"
APP_FILTER="chinese"        # matched against docker container name
LOCAL_DATA="./data"
REMOTE_DATA="/app/data"

FORCE=false
[[ "${1:-}" == "--force" ]] && FORCE=true

SERVER="$SERVER_USER@$SERVER_HOST"

echo "==> Connecting to $SERVER..."
CONTAINER=$(ssh "$SERVER" "docker ps --filter 'name=$APP_FILTER' --format '{{.Names}}' | head -1")

if [ -z "$CONTAINER" ]; then
    echo "ERROR: no running container matching '$APP_FILTER'"
    echo "Running containers:"
    ssh "$SERVER" "docker ps --format '{{.Names}}'"
    exit 1
fi

echo "==> Target container: $CONTAINER"
echo ""

for FILE in db.json progress.json calendar.json; do
    LOCAL="$LOCAL_DATA/$FILE"
    REMOTE="$REMOTE_DATA/$FILE"

    if [ ! -f "$LOCAL" ]; then
        echo "  SKIP  $FILE  (not found locally at $LOCAL)"
        continue
    fi

    if [ "$FORCE" = false ]; then
        EXISTS=$(ssh "$SERVER" "docker exec $CONTAINER sh -c 'test -f $REMOTE && echo yes || echo no'")
        if [ "$EXISTS" = "yes" ]; then
            echo "  SKIP  $FILE  (already on server — use --force to overwrite)"
            continue
        fi
    fi

    echo "  UP    $FILE"
    cat "$LOCAL" | ssh "$SERVER" "docker exec -i $CONTAINER sh -c 'cat > $REMOTE'"
done

echo ""
echo "==> Done."
