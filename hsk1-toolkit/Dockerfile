FROM nginx:1.27-alpine

COPY entrypoint.sh /entrypoint.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

RUN chmod +x /entrypoint.sh

EXPOSE 7432

ENTRYPOINT ["/entrypoint.sh"]
