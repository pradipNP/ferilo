# Deployment

## Target stack

| Piece | Recommendation |
|-------|----------------|
| Frontend | Vite static build on Netlify, Cloudflare Pages, or Nginx |
| Backend | Node 20+ on Render, Railway, Fly.io, or a VPS with PM2 |
| Database | Managed PostgreSQL (Neon, Supabase, Railway, or RDS) |
| Files | Local `uploads/` for MVP; move product images + identity docs to S3/R2 in production |
| Proxy | TLS-terminating reverse proxy (Caddy / Nginx) |

## Production checklist

1. Set `NODE_ENV=production`
2. Generate strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (32+ random bytes each)
3. Set `CLIENT_URL` to the real frontend origin (CORS + cookies)
4. Point `DATABASE_URL` at managed Postgres
5. Run `npm run db:setup` (or migrate + seed) against production
6. Change `ADMIN_EMAIL` / `ADMIN_PASSWORD` before first seed
7. Keep identity document directory private — never serve `/uploads/identity` publicly
8. Confirm rate-limit env vars (`RATE_LIMIT_*`) match expected traffic

## Build & run

```bash
npm install
npm run build                 # frontend → frontend/dist
npm run lint
npm test
NODE_ENV=production npm run start -w backend
```

Serve `frontend/dist` behind the same domain or CDN. Proxy `/api` and `/uploads/products` to the API.

## Suggested environment

Copy from `.env.example`, then override:

```
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-frontend.example
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=use-a-long-unique-password
```

## CI suggestion

On each pull request:

1. `npm ci`
2. `npm run lint`
3. `npm test`
4. `npm run build`

On merge to `main`, deploy backend + frontend and run migrations before starting the new API process.

## Notes

- Refresh cookies use `SameSite=Strict` and `Secure` in production.
- Health check: `GET /api/v1/health`
- MVP does not include payment gateway settlement — meetup/delivery only.
