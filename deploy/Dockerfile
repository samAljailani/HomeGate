FROM node:24-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --workspace=server && npm approve-scripts --all

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
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
