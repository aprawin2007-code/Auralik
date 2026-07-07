# ── BUILD STAGE ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

# Install build dependencies, generate prisma client
RUN npm ci
RUN npx prisma generate

COPY . .

RUN npm run build

# Remove development dependencies
RUN npm prune --production

# ── RUNTIME STAGE ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy built package and node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 3000

# Run prisma migration and start server
CMD ["sh", "-c", "npx prisma db push && node dist/main"]
