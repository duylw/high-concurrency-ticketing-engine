# ==============================================================================
# STAGE 1: Builder (Dependencies, Prisma Generation & Production Pruning)
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install OpenSSL & libc6-compat (required by Prisma engine on Alpine musl)
RUN apk add --no-cache openssl libc6-compat

# Copy package manifests & Prisma schema first for optimal Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies with robust network retry configurations
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Generate Prisma Client compiled for linux-musl
RUN npx prisma generate

# Prune devDependencies to keep only production dependencies
RUN npm prune --omit=dev

# ==============================================================================
# STAGE 2: Production Runner (Lean, Secure, Non-Root)
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install OpenSSL (for Prisma runtime) and dumb-init (for PID 1 signal forwarding)
RUN apk add --no-cache openssl libc6-compat dumb-init

# Create non-root system group and user for security compliance
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001 -G nodejs

# Copy pruned node_modules (containing compiled Prisma client) from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Copy application source code and static web assets
COPY --chown=nodejs:nodejs package.json ./
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs public ./public

# Set default production environment variables
ENV NODE_ENV=production \
  PORT=5001

# Enforce non-root execution
USER nodejs

# Expose HTTP port
EXPOSE 5001

# dumb-init forwards SIGTERM/SIGINT signals cleanly to Node.js graceful shutdown handler
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Default command starts the API server
CMD ["node", "src/server.js"]
