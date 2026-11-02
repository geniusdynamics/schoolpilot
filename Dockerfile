# ABOUTME: The image of the app (static bundle on nginx) and, as an experimental target, the LAN hub.
# ABOUTME: One build serves every customer: what differs between installs is read from /config.js at start.
#
# Two targets:
#   web - the browser app, built from this commit and served by nginx as an unprivileged user. This is
#         the production deliverable: the school's data lives in each browser's storage, so the image
#         is stateless and the backup file (Settings -> System -> Backup) is what protects the data.
#   hub - the LAN hub (API, auth, backups) from src/server. EXPERIMENTAL: the browser app does not sync
#         with it yet and it does not serve the app, so it is not part of the default deployment.
#
# Build:  docker build --target web -t schoolpilot:web .
#         docker build --target hub -t schoolpilot:hub .
# Run:    docker run --rm -p 8080:8080 -e SCHOOLPILOT_DEPLOYMENT_MODE=both schoolpilot:web

ARG NODE_VERSION=22

# ---------------------------------------------------------------------------- build
FROM node:${NODE_VERSION}-bookworm-slim AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    CI=1
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app

# The manifest and lockfile first, so a source-only change reuses the dependency layer.
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
# No VITE_* values are passed: the bundle carries no deployment secret, and the CI build does the same.
RUN pnpm -s build

# ---------------------------------------------------------------------------- web
FROM nginxinc/nginx-unprivileged:1.27-alpine AS web
# The headers, the wasm MIME type and the cache rules the built app needs live in this file; the
# headers are also a snippet, because a location with its own add_header does not inherit them.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
# Runs before nginx starts (the image's entrypoint executes /docker-entrypoint.d/*.sh) and writes the
# deployment's runtime settings to a path nginx serves as /config.js.
COPY --chmod=755 docker/web-entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --chown=101:101 --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
# The default nginx entrypoint stays: it starts the server after the scripts above ran.

# ---------------------------------------------------------------------------- hub (experimental)
FROM node:${NODE_VERSION}-bookworm-slim AS hub
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=1
RUN corepack enable \
    && apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Reuse the build stage's dependency tree: tsx runs the hub from source, so the dev dependencies are
# needed at run time and pruning would break it. Revisit when the hub is compiled.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/src ./src
COPY --from=build /app/server ./server
COPY --from=build /app/packaging ./packaging
COPY --chmod=755 docker/hub-entrypoint.sh /usr/local/bin/schoolpilot-hub

# The data directory holds the SQLite file, auth.key, keys/restricted-data.key, backups and TLS files:
# it must be a volume, or a container replacement loses the school.
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 8443
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD curl -fsS --max-time 4 "http://127.0.0.1:${SCHOOLPILOT_PORT:-8443}/health" >/dev/null || exit 1
ENTRYPOINT ["schoolpilot-hub"]
