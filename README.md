# FERILO

**Buy. Sell. Give It Another Life.**

FERILO is an open-source **ecommerce** / marketplace project — a peer-to-peer second-hand shopping platform focused on Nepal’s Lumbini region (Rupandehi & Kapilvastu). Think of it as ecommerce website source code for local classifieds: buyers and sellers, product catalogs, checkout-style orders (meetup or delivery), and an admin panel.

Sellers can complete an **in-app identity verification** workflow (document upload + admin review). That is a **product feature** for trust on the platform, not a government license, registration, or official endorsement.

Built as a full-stack learning / portfolio ecommerce app you can clone, run locally, or explore on the live demo: listings, search & filters, offers, messaging, orders, reviews, notifications, reports, and moderation.

## Live demo

| Service | URL |
|---------|-----|
| Website | https://ferilo.pages.dev |
| API | https://ferilo.onrender.com |
| Health | https://ferilo.onrender.com/api/v1/health |

**Notes**

- Free Render / Neon tiers can sleep. The first visit may take 30–60 seconds. The UI shows **Offline preview — connecting…** until the API wakes, then **Live from database**.
- `CLIENT_URL` on Render must be exactly `https://ferilo.pages.dev` (no trailing slash).

## Demo accounts

Use these after `npm run db:seed` (local or Neon). Passwords are for exploration only — change them before any real production use.

| Role | Email | Password | What you can try |
|------|--------|----------|------------------|
| Admin | `admin@ferilo.local` | `testing01` | Admin dashboard, verifications, reports, listings moderation |
| Buyer | `buyer@ferilo.local` | `demo1234` | Browse, favorites, offers, orders, messages |
| Seller | `seller@ferilo.local` | `demo1234` | Seller flows (listings require in-app verification status) |

Optional demo listings (~210 ACTIVE items with photos):

```bash
npm run db:seed-products
```

### Offline / API-down demo login

If the backend is unreachable, login still opens a portfolio offline session:

| Role | Email | Password |
|------|--------|----------|
| Demo buyer | `demo@ferilo.local` | any (e.g. `demo`) |
| Demo admin | `admin@ferilo.local` | any (e.g. `demo`) — email must contain `admin` |

Offline mode uses hardcoded sample data. Writes (create listing, place order, etc.) are blocked with a clear message.

## Features

- Full-stack ecommerce marketplace flows (browse → offer/message → order)
- Registration & JWT auth (access token + HttpOnly refresh cookie)
- Identity verification workflow (user docs + admin review — not a government certification)
- Product listings, images, categories, search & filters
- Favorites, offers/negotiation, messaging
- Orders (meetup & delivery) with delivery quote calculator
- Reviews & reputation, in-app notifications
- Reports & admin moderation
- Rate limiting, Helmet, Zod validation
- Portfolio offline fallback when Neon/Render are asleep

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React, JavaScript, Vite, React Router, Axios, CSS |
| Backend | Node.js, Express, JavaScript, JWT, Zod |
| Database | PostgreSQL |
| Testing | Node.js built-in test runner |
| Type | Open-source ecommerce / C2C marketplace |

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- npm 10+

## Quick start

```bash
git clone https://github.com/pradipNP/ferilo.git
cd ferilo
npm install
cp .env.example .env
```

Start Postgres (Docker example):

```bash
npm run db:up
```

Create tables, seed categories/delivery rules, and demo users:

```bash
npm run db:setup
```

Optional product catalog:

```bash
npm run db:seed-products
```

Run the app:

```bash
npm run dev
```

- Frontend: http://localhost:5180  
- API: http://localhost:5000/api/v1  
- Health: http://localhost:5000/api/v1/health  

Default Docker `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ferilo
```

Never commit a real `.env`. Copy from [`.env.example`](./.env.example).

## Useful commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend + backend |
| `npm run build` | Production frontend build |
| `npm run lint` | Lint backend + frontend |
| `npm test` | Backend tests |
| `npm run db:migrate` | Apply schema |
| `npm run db:seed` | Seed categories, zones, admin + demo users |
| `npm run db:seed-products` | Seed demo listings |
| `npm run db:setup` | Migrate + seed |

## Deploy (Neon + Render + Cloudflare)

Full guide: **[docs/deployment.md](./docs/deployment.md)**

Current public stack:

| Piece | Host |
|-------|------|
| Database | Neon |
| API | Render (`ferilo.onrender.com`) |
| Frontend | Cloudflare Pages (`ferilo.pages.dev`) |

## Contributing

Contributions are welcome. See **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

Ideas: issues labeled `good first issue`, UI polish, tests, docs, and deployment improvements.

## Documentation

- [Contributing](./CONTRIBUTING.md)
- [Database setup](./docs/database-setup.md)
- [Deployment](./docs/deployment.md)
- [Architecture](./docs/architecture.md)
- [API](./docs/api.md)
- [Database](./docs/database.md)
- [Security](./docs/security.md)
- [Development](./docs/development.md)

## Security note

Demo passwords are public by design for this portfolio demo. Rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, and all passwords before any serious production deployment. Do not commit secrets.

## License

This project is licensed under the [MIT License](./LICENSE).
