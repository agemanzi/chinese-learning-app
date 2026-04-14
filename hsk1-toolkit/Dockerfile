FROM nginx:alpine

COPY entrypoint.sh /entrypoint.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

RUN apk add --no-cache apache2-utils && \
    chmod +x /entrypoint.sh

EXPOSE 7432

ENTRYPOINT ["/entrypoint.sh"]
