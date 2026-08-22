# API Specification

> Base path: `/api/v1` (Phase 3+). Phase 1 uses `/api/health` only.

## Response format

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
```

## Error format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message."
  }
}
```

## Modules (planned)

| Prefix | Module |
|--------|--------|
| `/auth` | Authentication |
| `/users` | User profiles |
| `/verification` | Identity verification |
| `/categories` | Categories |
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

Full endpoint list is in the Phase 0 architecture document.
