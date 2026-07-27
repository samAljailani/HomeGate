# REST API Refactor Plan

## Overview

Transition the HomeGate API from action-based routes (`PUT /enable`, `PUT /disable`) to standard RESTful conventions using resource-based paths, PATCH for partial updates, and a policy object pattern.

---

## Phase 1: Database Migration — Add Subscription ID

**Goal:** Give `UserAccount` a single UUID primary key so subscriptions are addressable as `/api/subscriptions/:id`.

**Changes:**
- Add `id String @id @default(uuid()) @db.Uuid` to `UserAccount`
- Remove `@@id([userId, serviceId])` composite PK
- Add `@@unique([userId, serviceId])` constraint (preserves business rule)
- Run `prisma migrate dev`

**Migration behavior:** Prisma adds the column with a UUID default, backfills existing rows, drops the composite PK, creates the new single-column PK and unique index. Non-destructive.

**Files:**
- `prisma/models/entities.prisma`

---

## Phase 2: Subscriptions Controller — RESTful Routes

**Goal:** Replace action routes with resource-based PATCH/POST.

**New routes:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/subscriptions` | List all (admin) |
| GET | `/api/subscriptions/me` | List mine (user) |
| GET | `/api/subscriptions/:id` | Get one (admin) |
| POST | `/api/subscriptions` | Subscribe (user) |
| PATCH | `/api/subscriptions/:id` | Update state — policy object (admin) |
| POST | `/api/subscriptions/:id/renew` | Extend expiry (admin) |
| DELETE | `/api/subscriptions/:id` | Cancel (user/admin) |

**Policy object for PATCH:**
```json
{ "enabled": true, "autoRenew": false }
```
All fields optional — only provided fields are updated.

**Removed routes:**
- `PUT /subscriptions/disable`
- `PUT /subscriptions/enable`
- `PUT /subscriptions/renew`
- `PUT /subscriptions/auto-renew`

**Files:**
- `src/api/controllers/subscriptions.controller.ts`
- `src/types/dtos/subscriptionsDto.ts`
- `src/types/dtos/routes.ts`
- `src/api/services/subscriptions.service.ts` (method signature updates)
- `test/specs/controllers/subscriptions.controller.spec.ts`

---

## Phase 3: Users Controller — RESTful Routes

**Goal:** Replace enable/disable action routes with PATCH.

**New routes:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/users` | List all (admin) |
| GET | `/api/users/:id` | Get one (admin) |
| PATCH | `/api/users/:id` | Update state — policy object (admin) |
| DELETE | `/api/users/:id` | Delete (self or admin) |

**Policy object for PATCH:**
```json
{ "enabled": true }
```

**Removed routes:**
- `PUT /users/disable`
- `PUT /users/enable`

**Also changes:**
- `DELETE /users` (body-based) → `DELETE /users/:id` (path-based)
- Soft vs hard delete distinguished by query param: `?hard=true`
- Non-admin users always receive a soft delete regardless of query param (server ignores `?hard=true` for non-admins)

**Files:**
- `src/api/controllers/user.controller.ts`
- `src/types/dtos/userDto.ts`
- `src/types/dtos/routes.ts`
- `test/specs/controllers/user.controller.spec.ts`

---

## Phase 4: Services Controller — RESTful Routes

**Goal:** Replace enable/disable action routes with PATCH.

**New routes:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/services` | List all (admin) |
| PATCH | `/api/services/:name` | Update state (admin) |

**Policy object for PATCH:**
```json
{ "enabled": true }
```

**Removed routes:**
- `PUT /services/enable`
- `PUT /services/disable`

**Files:**
- `src/api/controllers/service.controller.ts`
- `src/types/dtos/serviceDto.ts`
- `src/types/dtos/routes.ts`
- `test/specs/controllers/service.controller.spec.ts`

---

## Phase 5: OAuth Providers Controller — RESTful Routes

**Goal:** Same pattern as Services.

**New routes:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/oauth-providers` | List all (admin) |
| PATCH | `/api/oauth-providers/:id` | Update state (admin) |

**Policy object for PATCH:**
```json
{ "enabled": true }
```

**Removed routes:**
- `PUT /oauth-providers/enable`
- `PUT /oauth-providers/disable`

**Files:**
- `src/api/controllers/oauthProvider.controller.ts`
- `src/types/dtos/oauthProviderDto.ts`
- `src/types/dtos/routes.ts`
- `test/specs/controllers/oauthProvider.controller.spec.ts`

---

## ~~Phase 6: Client Updates~~

Not needed — client is currently unconfigured.

---

## Phase 6: Cleanup & Remaining Controllers

- Change `PUT /api/tasks/:name` → `PATCH /api/tasks/:name`
- Change `PUT /api/invites/revoke/:id` → `PATCH /api/invites/:id` with body `{ revoked: true }`
- Remove dead DTOs (action request types replaced by patch DTOs)
- Remove unused route definitions from `routes.ts`
- Update Swagger decorators for new semantics

---

## Design Decisions

- **Renew is POST, not PATCH** — it has side effects (calculates expiry) and is not idempotent.
- **Delete uses path param** — `DELETE /resource/:id` is standard. Soft vs hard via query param.
- **Services identified by name** — they use autoincrement IDs internally but `name` is unique and more meaningful in URLs.
- **OAuth providers identified by numeric ID** — they're a fixed set, int IDs are fine in URLs.
- **No breaking auth/csrf changes** — those routes are already standard.
- **Invites revoke** → `PATCH /api/invites/:id` with policy object `{ revoked: true }` (during Phase 6).
- **Tasks update** → `PATCH /api/tasks/:name` (partial update, not full replace; during Phase 6).

---

## Order of Execution

| Phase | Commit message | Scope |
|-------|---------------|-------|
| 1 | `feat: add UUID primary key to UserAccount` | Migration only — schema + generated client |
| 2 | `refactor: RESTful subscriptions controller` | Controller, DTOs, routes, service signatures, tests |
| 3 | `refactor: RESTful users controller` | Controller, DTOs, routes, tests |
| 4 | `refactor: RESTful services controller` | Controller, DTOs, routes, tests |
| 5 | `refactor: RESTful oauth-providers controller` | Controller, DTOs, routes, tests |
| 6 | `refactor: RESTful invites and tasks controllers, remove dead code` | PUT→PATCH, route cleanup, dead DTO removal |

Phase 1 must come first. Phases 2–5 are independent and committed per-controller. Phase 6 is the final cleanup commit. Each commit should leave tests passing.
