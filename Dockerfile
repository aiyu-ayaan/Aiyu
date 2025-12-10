# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
# Next.js requires MONGODB_URI during build because db module is imported at top level
# However, it doesn't actually connect during build - it just needs a valid string
# We use a dummy value here to prevent credentials from being baked into image layers
# The real MONGODB_URI will be provided at runtime via docker-compose environment
ARG NEXT_PUBLIC_N8N_WEBHOOK_URL

# Set environment variables for build process
# Use dummy MongoDB URI during build (no actual connection is made)
ENV MONGODB_URI=mongodb://dummy:dummy@dummy:27017/dummy
ENV NEXT_PUBLIC_N8N_WEBHOOK_URL=${NEXT_PUBLIC_N8N_WEBHOOK_URL}

# Set dummy values for build-time checks (not used, only runtime matters)
# These prevent build errors but won't be in the final image or accessible at runtime
ENV ADMIN_USERNAME=dummy
ENV ADMIN_PASSWORD=dummy
ENV JWT_SECRET=dummy

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set to production environment
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
# Switch to non-root user
# USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set environment variable for port
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
