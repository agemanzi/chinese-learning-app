FROM nginx:alpine

COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN apk add --no-cache apache2-utils && \
    chmod +x /entrypoint.sh

EXPOSE 7432

ENTRYPOINT ["/entrypoint.sh"]
