#!/bin/bash
# Upload assets to the production container.
# Usage:
#   ./seed_remote.sh              — seed syllable audio (skip existing)
#   ./seed_remote.sh --force      — overwrite all files

set -e

SERVER_USER="root"
SERVER_HOST="46.224.104.232"
APP_FILTER="f8kg8ws44sockwos40cs4wcc"  # Coolify service UUID
LOCAL_AUDIO="./app/audio"
REMOTE_AUDIO="/usr/share/nginx/html/audio/syllables"

FORCE=false
[[ "${1:-}" == "--force" ]] && FORCE=true

SERVER="$SERVER_USER@$SERVER_HOST"

echo "==> Connecting to $SERVER..."
CONTAINER=$(ssh "$SERVER" "docker ps --filter 'name=$APP_FILTER' --format '{{.Names}}' | head -1")

if [ -z "$CONTAINER" ]; then
    echo "ERROR: no running container matching '$APP_FILTER'"
    ssh "$SERVER" "docker ps --format '{{.Names}}'"
    exit 1
fi

echo "==> Target container: $CONTAINER"
echo ""

# Ensure remote dir exists
ssh "$SERVER" "docker exec $CONTAINER mkdir -p $REMOTE_AUDIO"

# Get list of already-uploaded files to skip
if [ "$FORCE" = false ]; then
    echo "==> Checking existing files on server..."
    EXISTING=$(ssh "$SERVER" "docker exec $CONTAINER ls $REMOTE_AUDIO 2>/dev/null || true")
fi

COUNT=0
SKIP=0
for LOCAL in "$LOCAL_AUDIO"/*.mp3 "$LOCAL_AUDIO"/*.json; do
    [ -f "$LOCAL" ] || continue
    FILE=$(basename "$LOCAL")

    if [ "$FORCE" = false ] && echo "$EXISTING" | grep -qx "$FILE"; then
        SKIP=$((SKIP+1))
        continue
    fi

    printf "  UP  %s\r" "$FILE"
    scp -q "$LOCAL" "$SERVER:/tmp/_seed_$FILE"
    ssh "$SERVER" "docker cp /tmp/_seed_$FILE $CONTAINER:$REMOTE_AUDIO/$FILE && rm /tmp/_seed_$FILE"
    COUNT=$((COUNT+1))
done

echo ""
echo "==> Uploaded: $COUNT  Skipped: $SKIP"
echo "==> Done."
