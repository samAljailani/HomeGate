# API Endpoints — Change Summary

## Unchanged

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/auth/google` | Public | OAuth login |
| GET | `/api/auth/join` | Public | OAuth sign-up |
| GET | `/api/auth/google/redirect` | Public | OAuth callback |
| POST | `/api/auth/signOut` | User | Destroy session |
| GET | `/api/csrf` | Public | Get CSRF token |
| POST | `/api/invites` | Admin | Generate invite |
| GET | `/api/invites` | Admin | List invites |
| GET | `/api/invites/validate/:token` | Public | Validate token |
| GET | `/api/logs` | Admin | List logs |
| GET | `/api/tasks` | Admin | List task configs |

---

## Invites & Tasks — Changing

| Current | New | Change |
|---------|-----|--------|
| `PUT /api/invites/revoke/:id` | `PATCH /api/invites/:id` | Policy object `{ revoked: true }` |
| `PUT /api/tasks/:name` | `PATCH /api/tasks/:name` | Partial update semantics |

---

## Subscriptions — Changing

| Current | New | Change |
|---------|-----|--------|
| `POST /api/subscriptions` | `POST /api/subscriptions` | No change |
| `DELETE /api/subscriptions` (body) | `DELETE /api/subscriptions/:id` | ID in path |
| `PUT /api/subscriptions/disable` | `PATCH /api/subscriptions/:id` | Policy object `{ enabled: false }` |
| `PUT /api/subscriptions/enable` | `PATCH /api/subscriptions/:id` | Policy object `{ enabled: true }` |
| `PUT /api/subscriptions/renew` | `POST /api/subscriptions/:id/renew` | Action sub-resource |
| `PUT /api/subscriptions/auto-renew` | `PATCH /api/subscriptions/:id` | Policy object `{ autoRenew: bool }` |
| `GET /api/subscriptions/me` | `GET /api/subscriptions/me` | No change |
| `GET /api/subscriptions` | `GET /api/subscriptions` | No change |
| `GET /api/subscriptions/user/:userId` | `GET /api/subscriptions?userId=:id` | Query param filter |

---

## Users — Changing

| Current | New | Change |
|---------|-----|--------|
| `PUT /api/users/disable` | `PATCH /api/users/:id` | Policy object `{ enabled: false }` |
| `PUT /api/users/enable` | `PATCH /api/users/:id` | Policy object `{ enabled: true }` |
| `DELETE /api/users` (body) | `DELETE /api/users/:id?hard=true` | ID in path, query param for mode |
| `GET /api/users` | `GET /api/users` | No change |
| `GET /api/users/:id` | `GET /api/users/:id` | No change |

---

## Services — Changing

| Current | New | Change |
|---------|-----|--------|
| `PUT /api/services/enable` | `PATCH /api/services/:name` | Policy object `{ enabled: true }` |
| `PUT /api/services/disable` | `PATCH /api/services/:name` | Policy object `{ enabled: false }` |
| `GET /api/services` | `GET /api/services` | No change |

---

## OAuth Providers — Changing

| Current | New | Change |
|---------|-----|--------|
| `PUT /api/oauth-providers/enable` | `PATCH /api/oauth-providers/:id` | Policy object `{ enabled: true }` |
| `PUT /api/oauth-providers/disable` | `PATCH /api/oauth-providers/:id` | Policy object `{ enabled: false }` |
| `GET /api/oauth-providers` | `GET /api/oauth-providers` | No change |
