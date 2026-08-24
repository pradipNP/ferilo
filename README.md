# FERILO

**Buy. Sell. Give It Another Life.**

FERILO is a verified peer-to-peer second-hand marketplace built for Nepal. Registered users can buy and sell pre-loved items with identity verification, transparent delivery pricing, offers/negotiation, and admin moderation.

## Features (planned)

- User registration & JWT authentication
- Identity verification workflow (secure document storage)
- Product listings with images, categories, search & filters
- Favorites, offers, messaging, orders (meetup & delivery)
- Delivery charge calculator (distance + trolley/large-item fees)
- Reviews, reputation, notifications, reports
- Admin dashboard & audit logs

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React, JavaScript, Vite, React Router, Axios, CSS |
| Backend | Node.js, Express, JavaScript, JWT, Zod |
| Database | PostgreSQL |
| Testing | Jest, Supertest, Vitest |

## Project structure

```
ferilo/
├── frontend/src/      # main.jsx, App.jsx, styles.css
├── backend/src/       # server.js, db.js
├── database/          # schema.sql, seed.sql
└── docs/
```

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ ([download](https://www.postgresql.org/download/windows/))
- npm 10+

## Database setup (beginner)

Full step-by-step guide: **[docs/database-setup.md](./docs/database-setup.md)**

Quick start with Docker:

```powershell
npm run db:up          # start PostgreSQL in Docker
npm run db:setup       # create tables + seed data
npm run dev
```

Default Docker connection in `.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ferilo
```

Schema uses **plain PostgreSQL SQL only** (no PL/pgSQL triggers). The homepage shows **fallback categories instantly**, then switches to live database data when the API is ready (useful when Neon wakes from sleep).

## Quick start

```bash
# Clone and install
npm install

# Copy environment file
cp .env.example .env

# Set up PostgreSQL (create database first), then:
npm run db:setup

# Run frontend + backend together
npm run dev
```

- Frontend: http://localhost:5180
- Backend health: http://localhost:5000/api/health

## Environment variables

See [`.env.example`](./.env.example) for all variables. Never commit `.env`.

## Documentation

- [Architecture](./docs/architecture.md)
- [Database](./docs/database.md)
- [API](./docs/api.md)
- [Security](./docs/security.md)
- [Development](./docs/development.md)
- [Deployment](./docs/deployment.md)

## Development phases

Development proceeds in incremental phases with a stable Git commit after each. See [docs/development.md](./docs/development.md).

## License

Private portfolio project.
