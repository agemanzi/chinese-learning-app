FROM nginx:1.27-alpine

RUN apk add --no-cache apache2-utils

COPY entrypoint.sh /entrypoint.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

RUN chmod +x /entrypoint.sh

EXPOSE 7432

ENTRYPOINT ["/entrypoint.sh"]
