# API Specification

Base path: `/api/v1`

## Response format

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "total": 0 } }
```

## Error format

```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message." } }
```

## Live endpoints (Phase 3)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | API + database status |
| GET | `/categories` | Public | List active categories |
| GET | `/categories/:slug` | Public | Category by slug |

| GET | `/auth/me` | User (Bearer token) | Current user profile |
| POST | `/auth/register` | Public | Register + get tokens |
| POST | `/auth/login` | Public | Login + get tokens |
| POST | `/auth/refresh` | Refresh cookie | New access token |
| POST | `/auth/logout` | Public | Revoke session |

Legacy `/api/health` redirects to `/api/v1/health`.

**JWT strategy:** access token in JSON response (frontend memory), refresh token in HttpOnly cookie.

## Planned modules

| Prefix | Module |
|--------|--------|
| `/auth` | Authentication |
| `/users` | User profiles |
| `/verification` | Identity verification |
| `/products` | Product listings |
| `/favorites` | Favorites |
| `/offers` | Offers & negotiation |
| `/conversations` | Messaging |
| `/orders` | Orders |
| `/delivery` | Delivery calculation |
| `/reviews` | Reviews |
| `/reports` | Reports |
| `/notifications` | Notifications |
| `/admin` | Admin operations |
