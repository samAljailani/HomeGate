FROM node:24-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install production dependencies only
FROM base AS deps
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY packages/types/package.json packages/types/
RUN npm ci --omit=dev --workspace=server --workspace=packages/types

# Final image
FROM base
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules

# Copy Prisma schema for runtime migration
COPY server/prisma ./server/prisma
COPY server/package.json ./server/

# These are populated by the CD pipeline from CI artifacts
COPY server/dist ./server/dist
COPY client/out ./server/dist/client

WORKDIR /app/server

# Generate Prisma client inside the container
RUN npx prisma generate

ARG PORT=3003
EXPOSE ${PORT}
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
