# Nginx + watchdog: container exits when splash-relay stops accepting WS TCP port.
FROM nginx:alpine
RUN apk add --no-cache netcat-openbsd
COPY relay-watch-entrypoint.sh /relay-watch-entrypoint.sh
RUN chmod +x /relay-watch-entrypoint.sh
ENTRYPOINT ["/relay-watch-entrypoint.sh"]
