#!/bin/sh
# Inject SHA-256 hash of APP_PASSWORD into index.html + set up nginx basic auth
if [ -n "$APP_PASSWORD" ]; then
    PASS_HASH=$(echo -n "$APP_PASSWORD" | sha256sum | cut -d' ' -f1)
    sed -i "s|__PASS_HASH__|$PASS_HASH|g" /usr/share/nginx/html/index.html

    # Generate htpasswd and enable nginx basic auth (protects all files at network level)
    htpasswd -cbB /etc/nginx/.htpasswd hsk1 "$APP_PASSWORD"
    sed -i 's|__NGINX_AUTH__|auth_basic "HSK 1 Toolkit"; auth_basic_user_file /etc/nginx/.htpasswd;|' /etc/nginx/conf.d/default.conf
else
    # No password configured — remove the placeholder, allow open access
    sed -i 's|__NGINX_AUTH__||' /etc/nginx/conf.d/default.conf
fi

# Inject PocketBase URL (optional — if not set, sync is disabled)
if [ -n "$PB_URL" ]; then
    sed -i "s|__PB_URL__|$PB_URL|g" /usr/share/nginx/html/index.html
fi

# Ensure syllable audio dir exists (volume mount target)
mkdir -p /usr/share/nginx/html/audio/syllables

exec nginx -g "daemon off;"
