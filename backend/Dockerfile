# ── Stage 1: Build the TypeScript backend ──────────────
FROM node:24-alpine AS build

WORKDIR /app

# Full install (dev deps included) so typescript can compile
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Runtime image ─────────────────────────────
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Production deps only. Migrations run at container start via the compiled
# migrator (dist/db/migrate.js), so drizzle-kit is not needed here.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle

EXPOSE 8080
# Apply pending migrations, then start the API
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
