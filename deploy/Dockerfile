FROM node:24-slim AS base

RUN apt-get update \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/

RUN npm ci --workspace=server --omit=dev && npm approve-scripts --all

# Prisma runtime files
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/prisma.config.ts

# CI build artifacts
COPY server/dist ./server/dist
COPY client/out ./server/dist/client

WORKDIR /app/server

# Generate Prisma client
RUN npx prisma generate --config=prisma.config.ts

ARG PORT=3003
EXPOSE ${PORT}

CMD ["sh", "-c", "npx prisma migrate deploy --config=prisma.config.ts && node dist/src/main.js"]
