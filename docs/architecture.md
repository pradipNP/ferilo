# FERILO Architecture

## Overview

FERILO is a monorepo with a React SPA frontend and Express REST API backend, backed by PostgreSQL.

```
React (Vite) ──HTTPS/REST──► Express API ──► PostgreSQL
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
            Product images (public)    Identity docs (private)
```

## Modules

| Module | Responsibility |
|--------|----------------|
| auth | Registration, login, JWT, refresh tokens |
| users | Profiles, public seller cards |
| verification | Identity submission & admin review |
| products | Listings, images, statuses |
| categories | Database-driven category tree |
| favorites | Wishlist |
| offers | Negotiation lifecycle |
| messaging | Buyer-seller conversations |
| orders | Purchase flow, snapshots, state machine |
| delivery | Zone/rate config, charge calculation |
| reviews | Post-transaction ratings |
| notifications | In-app notifications |
| reports | Fraud reporting & admin resolution |
| admin | Dashboard, moderation, audit logs |

## Key decisions

- **JavaScript** on frontend and backend — simpler stack, fewer build steps.
- **Backend is authoritative** for pricing, delivery, order state, and verification.
- **Identity documents** stored in private storage; only metadata in PostgreSQL.
- **Order price snapshots** preserve transaction values at purchase time.
- **JWT**: access token (short-lived) + refresh token (HttpOnly cookie) — detailed in Phase 4.

## Default MVP assumptions

| Decision | Choice |
|----------|--------|
| Geography | Nepal (NPR) |
| Distance (MVP) | Admin city-pair matrix |
| Listing moderation | Verified users → ACTIVE; admin can remove via reports |
| Payments | Record totals only; offline settlement in MVP |
| Email | Console/mock logger |
| Admin | Seeded via migration |

See the full Phase 0 plan in project chat history for ERD, API spec, and roadmap.
