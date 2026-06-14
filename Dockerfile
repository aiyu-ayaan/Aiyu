# Stage 1: Dependencies
# Use Debian (glibc) instead of Alpine (musl) for more reliable native builds on Windows/WSL.
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Install compiler toolchain for native modules (e.g. sharp/canvas-related transitive deps).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests for deterministic installs.
# The prisma schema is needed because the `postinstall` script runs `prisma generate`.
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Harden npm fetch behavior for flaky network/proxy conditions.
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-factor 2 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --include=dev --legacy-peer-deps --no-audit --no-fund --prefer-offline

# Stage 2: Builder
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# OpenSSL is required by the Prisma query engine at generate/runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure the Prisma client is generated against the committed schema.
RUN npx prisma generate

# Build-time args
ARG NEXT_PUBLIC_N8N_WEBHOOK_URL
ARG NEXT_PUBLIC_AUTHOR_NAME
ARG NEXT_PUBLIC_BASE_URL
ARG SITE_URL

# Build with ephemeral env values (prevents secret-name warnings from ENV instructions).
# DATABASE_URL is a dummy here; no DB connection happens during the build.
RUN DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy?schema=public" \
    NEXT_PUBLIC_N8N_WEBHOOK_URL="${NEXT_PUBLIC_N8N_WEBHOOK_URL}" \
    NEXT_PUBLIC_AUTHOR_NAME="${NEXT_PUBLIC_AUTHOR_NAME}" \
    NEXT_PUBLIC_BASE_URL="${NEXT_PUBLIC_BASE_URL}" \
    SITE_URL="${SITE_URL}" \
    ADMIN_USERNAME="dummy" \
    ADMIN_PASSWORD="dummy" \
    JWT_SECRET="dummy" \
    NEXT_TELEMETRY_DISABLED=1 \
    npm run build -- --webpack

# Stage 3: Runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# OpenSSL is required by the Prisma engines at runtime (migrate deploy + client).
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Runtime environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nextjs

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma assets needed to run `migrate deploy` at container start.
# The schema + migrations and the Prisma CLI/engines are not part of the
# Next.js standalone trace, so copy them explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy healthcheck script and the entrypoint
COPY --chown=nextjs:nodejs scripts/healthcheck.sh /app/healthcheck.sh
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh /app/docker-entrypoint.sh

# Create writable directories needed when running with read-only root fs.
RUN mkdir -p /app/public/uploads \
    && mkdir -p /app/.next/cache \
    && chmod +x /app/healthcheck.sh /app/docker-entrypoint.sh \
    && chown -R nextjs:nodejs /app/public/uploads /app/.next/cache

# Switch to non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Runtime network settings
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Apply migrations (when RUN_MIGRATIONS=true) then start one Next.js server
# process. This is much lighter than PM2 clustering and is the best default
# for small VPS/Docker Desktop deployments.
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
