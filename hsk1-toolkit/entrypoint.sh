#!/bin/sh
# Generate htpasswd from APP_PASSWORD env var
if [ -n "$APP_PASSWORD" ]; then
    htpasswd -bc /etc/nginx/.htpasswd "${APP_USER:-user}" "$APP_PASSWORD"
else
    # No password set — create dummy file so nginx starts
    echo "" > /etc/nginx/.htpasswd
    sed -i '/auth_basic/d' /etc/nginx/conf.d/default.conf
fi

# Ensure syllable audio dir exists (volume mount target)
mkdir -p /usr/share/nginx/html/audio/syllables

exec nginx -g "daemon off;"
