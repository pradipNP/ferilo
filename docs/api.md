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

Legacy `/api/health` redirects to `/api/v1/health`.

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
