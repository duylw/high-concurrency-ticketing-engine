# ==============================================================================
# STAGE 1: Builder (Build React SPA with Vite & Tailwind v4)
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy client source code and build production bundle
COPY . .
RUN npm run build

# ==============================================================================
# STAGE 2: Static Host (Ultra-lightweight Nginx Alpine < 25MB)
# ==============================================================================
FROM nginx:1.27-alpine

# Copy custom Nginx configuration for SPA routing and asset caching
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production static bundle from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
