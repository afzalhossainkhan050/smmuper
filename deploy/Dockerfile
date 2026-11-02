# SMMuper production image (build context = project root)
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-alpine AS server-deps
WORKDIR /app/server
RUN apk add --no-cache python3 make g++
COPY server/package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production PORT=5000 DB_PATH=/app/server/db/smm_uper.db
WORKDIR /app
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
RUN mkdir -p server/db server/backups server/uploads \
 && chown -R node:node server/db server/backups server/uploads
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:5000/api/health || exit 1
# Seeding is idempotent: creates roles/settings/admin only if missing.
CMD ["sh", "-c", "node server/db/seed.js && exec node server/index.js"]
