# Deployment — Neon + Render + Cloudflare Pages

FERILO free-tier open-source demo stack:

| Piece | Service | Current demo |
|-------|---------|--------------|
| Database | [Neon](https://neon.tech) | Project database |
| Backend API | [Render](https://render.com) | https://ferilo.onrender.com |
| Frontend | [Cloudflare Pages](https://pages.cloudflare.com) | https://ferilo.pages.dev |

Push `main` to GitHub, then connect each service. Never commit `.env`.

---

## 1. Neon (database)

1. Create a project at https://console.neon.tech  
2. Copy the pooled connection string (`sslmode=require`). You can omit `channel_binding=require` if Node/pg warns.  
3. From your machine:

```powershell
$env:DATABASE_URL="postgresql://USER:PASS@HOST/neondb?sslmode=require"
$env:ADMIN_EMAIL="admin@ferilo.local"
$env:ADMIN_PASSWORD="testing01"
npm run db:setup
npm run db:seed-products
```

`db:setup` creates schema + categories + admin/demo users.  
`db:seed-products` adds demo listings (public picsum image URLs — works on Render).

---

## 2. Render (backend)

1. **New → Web Service** → connect `pradipNP/ferilo`  
2. Settings:

| Field | Value |
|-------|--------|
| Runtime | Node |
| Branch | `main` |
| Root Directory | *(empty)* |
| Build Command | `npm install` |
| Start Command | `npm run start -w backend` |
| Instance | Free |

3. Environment variables:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=<Neon connection string>
CLIENT_URL=https://ferilo.pages.dev
PUBLIC_API_URL=https://ferilo.onrender.com
JWT_SECRET=<long random string>
JWT_REFRESH_SECRET=<another long random string>
ADMIN_EMAIL=admin@ferilo.local
ADMIN_PASSWORD=testing01
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=300
AUTH_RATE_LIMIT_MAX=40
```

**Important:** `CLIENT_URL` must match the browser origin exactly — **no trailing slash**.

4. Health check: https://ferilo.onrender.com/api/v1/health  

Free Render sleeps when idle; first request can take 30–60s.

---

## 3. Cloudflare Pages (frontend)

1. **Workers & Pages → Create → Pages → Connect to Git** → `ferilo`  
2. Framework preset: **None** (not VitePress)  
3. Build from repo root:

| Field | Value |
|-------|--------|
| Root directory | *(empty)* |
| Build command | `npm run build` |
| Build output directory | `frontend/dist` |
| Node version | `20` |

4. Production environment variable:

```
VITE_API_URL=https://ferilo.onrender.com
```

You **must rebuild** after adding/changing `VITE_API_URL` (it is baked in at build time).

5. Confirm Render `CLIENT_URL=https://ferilo.pages.dev` and redeploy if needed.

---

## Checklist

- [ ] Neon: `db:setup` (+ optional `db:seed-products`)
- [ ] Render health shows `database: connected`
- [ ] Cloudflare `VITE_API_URL` set and redeployed
- [ ] Render `CLIENT_URL` has **no trailing slash**
- [ ] Render `PUBLIC_API_URL` set
- [ ] Login works with demo accounts from the README

---

## Common issues

| Problem | Fix |
|---------|-----|
| Offline preview forever | Missing/wrong `VITE_API_URL`, or CORS `CLIENT_URL` mismatch (trailing slash) |
| Live badge but 0 listings | Run `npm run db:seed-products` against Neon |
| ACCOUNT_LOCKED / too many attempts | Unlock in Neon SQL, then `npm run db:seed` with `ADMIN_PASSWORD=testing01` |
| Images broken | Prefer remote picsum URLs from current seed-products; set `PUBLIC_API_URL` for any `/uploads` paths |
| Root URL on Render returns JSON only | Expected — website is on Cloudflare Pages |

## Unlock admin (Neon SQL Editor)

```sql
UPDATE users
SET failed_login_attempts = 0, locked_until = NULL
WHERE email = 'admin@ferilo.local';
```
