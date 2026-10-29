# ORIM — container image for the Africa's Talking Marketplace (or any Docker host).
# Uses Next.js standalone output. With no DATABASE_URL, data lives in embedded Postgres under /data.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    ORIM_DATA_DIR=/data
RUN addgroup -S orim && adduser -S orim -G orim && mkdir -p /data && chown orim:orim /data
COPY --from=build /app/public ./public
COPY --from=build --chown=orim:orim /app/.next/standalone ./
COPY --from=build --chown=orim:orim /app/.next/static ./.next/static
USER orim
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/competitions >/dev/null || exit 1
CMD ["node", "server.js"]
