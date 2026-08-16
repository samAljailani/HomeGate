FROM node:24-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install production dependencies only
FROM base AS deps
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY packages/types/package.json packages/types/
RUN npm ci --omit=dev --workspace=server --workspace=packages/types && npm approve-scripts

# Final image
FROM base
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace packages source (symlinked from node_modules)
COPY packages/types ./packages/types

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
CMD ["sh", "-c", "if npx prisma migrate status 2>&1 | grep -q 'Database schema is not empty'; then npx prisma db push --skip-generate; else npx prisma migrate deploy; fi && node dist/main.js"]
