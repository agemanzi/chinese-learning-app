FROM alpine:3.19

ARG PB_VERSION=0.22.22

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip

RUN apk add --no-cache unzip ca-certificates curl jq && \
    unzip /tmp/pb.zip -d /pb && \
    chmod +x /pb/pocketbase && \
    rm /tmp/pb.zip

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /pb
VOLUME ["/pb/pb_data"]
EXPOSE 7433

ENTRYPOINT ["/entrypoint.sh"]
