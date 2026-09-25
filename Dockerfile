# ==============================================================================
# STAGE 1: Builder (Dependencies, Prisma Generation & TypeScript Compilation)
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install OpenSSL & libc6-compat (required by Prisma engine on Alpine musl)
RUN apk add --no-cache openssl libc6-compat

# Copy package manifests, tsconfig & Prisma schema first for optimal Docker layer caching
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies required for compilation)
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Generate Prisma Client compiled for linux-musl
RUN npx prisma generate

# Copy backend TypeScript source code
COPY src ./src

# Compile TypeScript into JavaScript (output: dist/)
RUN npm run build

# Prune devDependencies to keep only production dependencies
RUN npm prune --omit=dev

# ==============================================================================
# STAGE 2: Production Runner (Lean, Secure, Non-Root Headless API)
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

# Copy compiled JavaScript output from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package.json ./

# Set default production environment variables
ENV NODE_ENV=production \
  PORT=5001

# Enforce non-root execution
USER nodejs

# Expose HTTP port
EXPOSE 5001

# dumb-init forwards SIGTERM/SIGINT signals cleanly to Node.js graceful shutdown handler
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Default command starts the Headless API server
CMD ["node", "dist/server.js"]
