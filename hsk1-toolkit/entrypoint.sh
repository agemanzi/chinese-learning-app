#!/bin/sh
# Inject SHA-256 hash of APP_PASSWORD into index.html
if [ -n "$APP_PASSWORD" ]; then
    PASS_HASH=$(echo -n "$APP_PASSWORD" | sha256sum | cut -d' ' -f1)
    sed -i "s|__PASS_HASH__|$PASS_HASH|g" /usr/share/nginx/html/index.html
fi

# Ensure syllable audio dir exists (volume mount target)
mkdir -p /usr/share/nginx/html/audio/syllables

exec nginx -g "daemon off;"
