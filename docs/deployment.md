# Deployment — Neon + Render + Cloudflare Pages

FERILO free-tier portfolio setup:

| Piece | Service |
|-------|---------|
| Database | [Neon](https://neon.tech) PostgreSQL |
| Backend API | [Render](https://render.com) Web Service |
| Frontend | [Cloudflare Pages](https://pages.cloudflare.com) |

Repo: push `main` to GitHub first, then connect each service to that repo / connection string.

---

## 0. Push code to GitHub

```powershell
git add -A
git commit -m "Prepare portfolio offline fallback and free-tier deploy"
git push origin main
```

Do **not** commit `.env`. Secrets go only in Neon / Render / Cloudflare dashboards.

---

## 1. Neon (database)

1. Create a project at https://console.neon.tech  
2. Copy the **connection string** (include `sslmode=require`).  
3. From your machine (with that URL in a temporary env), run schema + seed:

```powershell
$env:DATABASE_URL="postgresql://USER:PASS@HOST/neondb?sslmode=require"
npm run db:setup
```

Optional demo listings with photos (local machine; images land on whatever `UPLOAD_DIR` you use — on Render free disk is ephemeral):

```powershell
$env:DATABASE_URL="..."
npm run db:seed-products
```

Keep the Neon URL ready for Render.

---

## 2. Render (backend)

1. Dashboard → **New → Web Service** → connect `pradipNP/ferilo`  
2. Settings:

| Field | Value |
|-------|--------|
| Runtime | Node |
| Branch | `main` |
| Root Directory | *(leave empty — monorepo root)* |
| Build Command | `npm install` |
| Start Command | `npm run start -w backend` |
| Instance | Free |

3. **Environment** (Render → Environment):

```
NODE_ENV=production
PORT=10000
DATABASE_URL=<paste Neon connection string>
CLIENT_URL=https://YOUR-PROJECT.pages.dev
PUBLIC_API_URL=https://ferilo.onrender.com
JWT_SECRET=<long random string>
JWT_REFRESH_SECRET=<another long random string>
ADMIN_EMAIL=admin@ferilo.local
ADMIN_PASSWORD=testing01
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=300
AUTH_RATE_LIMIT_MAX=40
```

Generate secrets (PowerShell):

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

4. Deploy. Health check URL:

`https://ferilo.onrender.com/api/v1/health`

Expected: `{"success":true,"data":{"status":"ok",...,"database":"connected"}}`

**Note:** Free Render sleeps after idle. First request can take ~30–60s; FERILO shows **Offline preview** until the API wakes.

---

## 3. Cloudflare Pages (frontend)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → Connect to Git → `ferilo`  
2. Build settings:

| Field | Value |
|-------|--------|
| Framework preset | Vite |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `20` (Compatibility / Environment) |

If the monorepo install fails from `frontend` alone, use:

| Field | Value |
|-------|--------|
| Root directory | `/` (repo root) |
| Build command | `npm install && npm run build -w frontend` |
| Build output directory | `frontend/dist` |

3. **Environment variables** (Pages → Settings → Environment variables → Production):

```
VITE_API_URL=https://YOUR-SERVICE.onrender.com
```

No trailing slash.

4. Deploy. Open `https://YOUR-PROJECT.pages.dev`.

5. Go back to **Render** and set `CLIENT_URL` to that exact Pages URL (must match for CORS + cookies). Redeploy Render if you change it.

---

## 4. Wire-up checklist

- [ ] Neon: `db:setup` succeeded  
- [ ] Render health returns `database: connected`  
- [ ] Cloudflare has `VITE_API_URL` pointing at Render  
- [ ] Render `CLIENT_URL` matches Cloudflare URL exactly (`https://…pages.dev`)  
- [ ] Render `PUBLIC_API_URL` matches the Render URL (product images)  
- [ ] Login with `ADMIN_EMAIL` / `ADMIN_PASSWORD` when API is awake  
- [ ] Badge switches to **Live from database** after cold start  

---

## Local vs production API URL

| Environment | Frontend API calls |
|-------------|--------------------|
| Local `npm run dev` | Vite proxies `/api` → `localhost:5000` (`VITE_API_URL` empty) |
| Cloudflare Pages | `VITE_API_URL` → Render origin |

Cookies use `SameSite=None; Secure` in production so login works across Pages ↔ Render.

---

## Common issues

| Problem | Fix |
|---------|-----|
| CORS error | `CLIENT_URL` must equal the browser origin exactly |
| Login works then session drops | Confirm production cookies + HTTPS on both hosts |
| Images broken | Set `PUBLIC_API_URL` on Render |
| Always “Offline preview” | Render asleep or wrong `VITE_API_URL`; wait and refresh |
| Neon SSL error | Use connection string with `sslmode=require` |

---

## Optional next steps

- Custom domain on Cloudflare Pages + update `CLIENT_URL`  
- Move uploads to Cloudflare R2 / S3 (Render free disk resets)  
- Paid Render instance to avoid cold starts  
