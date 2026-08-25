# Development Guide

## Setup

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:setup
npm run dev
```

Demo accounts are created by `db:seed` / `db:setup`. See the root README.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:frontend` | Frontend only (port 5180) |
| `npm run dev:backend` | Backend only (port 5000) |
| `npm run build` | Build frontend for production |
| `npm run lint` | Lint both workspaces |
| `npm test` | Backend unit tests (Node test runner) |
| `npm run db:migrate` | Apply database/schema.sql |
| `npm run db:seed` | Seed categories, delivery data, admin + demo users |
| `npm run db:seed-products` | Seed ~210 demo ACTIVE listings |
| `npm run db:setup` | Migrate + seed |

## Git workflow

- `main` — stable branch
- Prefer Conventional Commits: `feat(auth): ...`, `fix(orders): ...`, `docs: ...`
- Open an issue before large features when possible

## MVP status

**MVP complete** — auth, verification, listings, search, favorites, offers, messaging, orders, reviews, notifications, reports, admin dashboard, rate limiting, offline fallback, and basic tests.

Local URLs:

- Frontend: http://localhost:5180
- API: http://localhost:5000/api/v1

Live demo URLs are listed in the root README.
