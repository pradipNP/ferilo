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

## Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <img src="assets/screenshots/01-home.png" alt="FERILO home hero" />
      <br /><sub><b>Home</b> — hero & live status</sub>
    </td>
    <td align="center" width="50%">
      <img src="assets/screenshots/02-browse-by-city.png" alt="Browse by city" />
      <br /><sub><b>Browse by city</b> — Lumbini region hubs</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="assets/screenshots/03-featured-listings.png" alt="Featured listings" />
      <br /><sub><b>Featured listings</b> — product cards</sub>
    </td>
    <td align="center" width="50%">
      <img src="assets/screenshots/04-browse-listings.png" alt="Browse listings with filters" />
      <br /><sub><b>All items</b> — search & filters</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="assets/screenshots/05-user-dashboard.png" alt="User dashboard" />
      <br /><sub><b>User dashboard</b> — listings, offers, orders</sub>
    </td>
    <td align="center" width="50%">
      <img src="assets/screenshots/06-admin-dashboard.png" alt="Admin dashboard" />
      <br /><sub><b>Admin dashboard</b> — users & moderation</sub>
    </td>
  </tr>
</table>

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
git clone https://github.com/pradipNP/ferilo-ecommerce-FullstackWebsite.git
cd ferilo-ecommerce-FullstackWebsite
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

Suggested starter tasks: see open GitHub Issues (labels `good first issue`, `help wanted`).  
Issue ideas for maintainers: [docs/github-issues.md](./docs/github-issues.md).

## Support / Star the project

If FERILO helps you — as a learning resource, portfolio reference, or marketplace starter — please **star the repository** on GitHub. It helps others discover the project and supports continued development.

[![Star FERILO on GitHub](https://img.shields.io/github/stars/pradipNP/ferilo-ecommerce-FullstackWebsite?style=social&label=Star%20FERILO)](https://github.com/pradipNP/ferilo-ecommerce-FullstackWebsite)

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
