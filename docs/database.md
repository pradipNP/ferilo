# Database Design

Schema lives in a single file: [`database/schema.sql`](../database/schema.sql)

Seed data: [`database/seed.sql`](../database/seed.sql)

## Commands

```bash
npm run db:migrate   # apply schema
npm run db:seed      # seed data + admin user
npm run db:setup     # both
```

Admin credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.

## Core entities

- `users`, `user_profiles`
- `identity_verifications`, `verification_documents` (metadata only)
- `categories` (self-referential tree)
- `products`, `product_images`
- `favorites`, `offers`
- `conversations`, `conversation_participants`, `messages`
- `orders`, `order_status_history`
- `delivery_zones`, `delivery_rates`, `delivery_rules`
- `reviews`, `reports`, `notifications`, `audit_logs`

## Conventions

- UUIDs for user-facing entity IDs
- `NUMERIC(12,2)` for money (NPR)
- `TIMESTAMPTZ` for all timestamps
- Status fields enforced with CHECK constraints
- Foreign keys with explicit ON DELETE behavior

Full column-level specification is in the Phase 0 architecture document.
