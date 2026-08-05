# HomeGate

HomeGate is a self-hosted gateway for managing access to your household's media and
self-hosted services (currently [Jellyfin](https://jellyfin.org/) and
[Immich](https://immich.app/)). It is closed-first: there is no public sign-up, and
new accounts can only be created through an admin-issued invite. Instead of creating
and tracking accounts on each service by hand, an admin invites people to HomeGate;
HomeGate handles sign-in, account provisioning on the underlying services, and
per-user subscription lifecycle (enable, disable, renew, auto-renew) from one place.

## Features

- **Invite-only onboarding** — admins generate invite links; there is no public
  registration. An invite is the only way to create an account.
- **OAuth sign-in** — users authenticate with an external identity provider (Google
  today; the provider strategy is pluggable) instead of a HomeGate-managed password.
  Server-side, cookie-backed sessions track login state.
- **Service subscriptions** — admins grant/revoke a user's access to a service
  (Jellyfin, Immich, ...), with support for renewal and auto-renew, and HomeGate
  provisions/deprovisions the corresponding account on that service automatically.
- **Admin management** — list/enable/disable users, services, and OAuth providers;
  view system logs; configure background task schedules.
- **Scheduled maintenance** — background jobs (e.g. processing expiring
  subscriptions, syncing client accounts, cleaning up abandoned sign-ups) run on
  configurable cron schedules, with runtime overrides stored in the database.
- **Fully typed client ↔ server contract** — a front-end React application talks to
  the API surface described via OpenAPI (generated from the server's NestJS
  decorators), with a generated types package giving the client compile-time-checked
  requests/responses.

## Project structure

This is an npm-workspaces monorepo:

| Workspace | Description |
| --- | --- |
| [`server/`](server) | NestJS API — auth, invites, users, subscriptions, services, OAuth providers, logs, and the task scheduler. Talks to PostgreSQL (via Prisma) and to the underlying services (Jellyfin, Immich). |
| [`packages/types/`](packages/types) | Generated from the server's OpenAPI schema: shared `paths`/`components`/`operations` types and a typed `createApiClient` (`openapi-fetch` wrapper), published to GitHub Packages and consumed by the client. |
| [`client/`](client) | Next.js web app. Talks to the server exclusively through typed service modules built on `packages/types`. |

For deeper dives into specific subsystems (sign-in & sessions, invite lifecycle,
background tasks, and more), see [server/docs](server/docs).

## Prerequisites

- Node.js (see `engines`/CI config for the exact version) and npm
- A PostgreSQL database
- OAuth credentials for at least one supported provider (e.g. a Google OAuth client)
- Access to the services you want HomeGate to manage (e.g. a Jellyfin and/or Immich
  instance + API key)

## Getting started

1. **Install dependencies** (from the repo root):

   ```sh
   npm install
   ```

2. **Configure the server.** Copy [`server/.env.example`](server/.env.example) to
   `server/.env` and fill in the values (database connection, session secret, OAuth
   client id/secret, and any enabled service credentials such as
   `JELLYFIN_BASE_URL`/`JELLYFIN_API_KEY` or `IMMICH_BASE_URL`/`IMMICH_API_KEY`).

3. **Set up the database.** Apply Prisma migrations from `server/`:

   ```sh
   cd server
   npx prisma migrate deploy
   ```

4. **Run in development** (from the repo root, in separate terminals):

   ```sh
   cd client
   npm run build
   cd ..
   npm run start:dev:server
   ```

5. **Build for production**:

   ```sh
   npm run build           # builds packages/types, then client, then server
   npm run start:prod:server
   ```

## Using HomeGate

Once running, an existing admin account generates an invite (`POST /api/invites`) and
shares the resulting link. The invited person follows the link, signs in with an
enabled OAuth provider, and their account is created and activated automatically. From
there, an admin grants the user a subscription to one or more services, and HomeGate
provisions their access on that service directly — no manual account creation on
Jellyfin/Immich required. Admins manage everything else (users, services, OAuth
providers, logs, scheduled tasks) through the same authenticated API, consumed by the
HomeGate web client.
