# FERILO

**Buy. Sell. Give It Another Life.**

FERILO is a verified peer-to-peer second-hand marketplace built for Nepal. Registered users can buy and sell pre-loved items with identity verification, transparent delivery pricing, offers/negotiation, and admin moderation.

## Features

- User registration & JWT authentication (access + HttpOnly refresh)
- Identity verification workflow with admin review
- Product listings with images, categories, search & filters
- Favorites, offers/negotiation, messaging, orders (meetup & delivery)
- Delivery charge calculator (city distances + trolley fees)
- Reviews & reputation, in-app notifications
- Reports & admin moderation (users, listings, reports, orders)
- Rate limiting, Helmet, Zod validation, audit logs

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React, JavaScript, Vite, React Router, Axios, CSS |
| Backend | Node.js, Express, JavaScript, JWT, Zod |
| Database | PostgreSQL |
| Testing | Node.js built-in test runner |

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

## Deploy (free portfolio)

Step-by-step: **[docs/deployment.md](./docs/deployment.md)** — Neon (DB) + Render (API) + Cloudflare Pages (frontend).

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

MVP feature set is complete. See [docs/development.md](./docs/development.md) and [docs/deployment.md](./docs/deployment.md).

## License

Private portfolio project.
