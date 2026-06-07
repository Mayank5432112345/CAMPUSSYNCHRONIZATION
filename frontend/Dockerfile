# Multi-stage Dockerfile for Next.js app
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN apk add --no-cache --virtual .gyp python3 make g++ \
  && if [ -f package-lock.json ]; then npm ci --silent; elif [ -f yarn.lock ]; then npm ci --silent; else npm ci --silent; fi \
  && apk del .gyp || true

# Copy rest of the app
COPY . .

# Build the app
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy built app and node_modules from builder
COPY --from=builder /app/.next .next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Install only production deps
RUN npm ci --only=production --silent || true

EXPOSE ${PORT}

# Use Next.js start
CMD ["npm", "start"]
