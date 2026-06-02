ARG BUN_IMAGE=oven/bun:1

FROM ${BUN_IMAGE} AS deps
WORKDIR /repo
COPY . .
RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS api-build
WORKDIR /repo/servers/api
RUN bun run build:bun

FROM oven/bun:1-slim AS api
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=api-build /repo/servers/api/.output ./.output
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]

FROM deps AS instance-build
WORKDIR /repo/servers/instance
RUN bun run build:bun

FROM oven/bun:1-slim AS instance
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=instance-build /repo/servers/instance/.output ./.output
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]

FROM deps AS web-build
ARG VITE_BASE_URL=https://api.newsnext.pro
ENV VITE_BASE_URL=${VITE_BASE_URL}
WORKDIR /repo/apps/web
RUN bun run build

FROM nginx:1.27-alpine AS web
COPY docker/nginx-web.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
