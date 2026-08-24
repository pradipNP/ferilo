# Database setup guide (beginner)

FERILO uses **plain PostgreSQL SQL** only (tables, indexes, constraints). No PL/pgSQL functions or triggers — `updated_at` is handled in the Node.js backend.

---

## Option A — Docker (recommended for beginners)

### Step 1: Start PostgreSQL in Docker

Open **PowerShell** in your project folder (`D:\Web_Projects\Ferilo`):

```powershell
docker compose up -d
```

Check it is running:

```powershell
docker ps
```

You should see a container named `ferilo-db`.

### Step 2: Set your `.env` file

Copy `.env.example` to `.env` if you have not already.

Use this connection string for Docker:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ferilo
```

### Step 3: Create tables and seed data

```powershell
npm run db:setup
```

You should see:

- `Database schema applied successfully.`
- `Database seeded successfully.`

### Step 4: Start the app

```powershell
npm run dev
```

### Step 5: Test in browser or PowerShell

```powershell
Invoke-RestMethod http://localhost:5000/api/v1/health
Invoke-RestMethod http://localhost:5000/api/v1/categories
```

Health should show `"database": "connected"`. Categories should return a JSON list.

### Step 6: Connect pgAdmin 4 (optional visual tool)

1. Open **pgAdmin 4**
2. Right-click **Servers** → **Register** → **Server**
3. **General** tab → Name: `FERILO Local`
4. **Connection** tab:
   - Host: `localhost`
   - Port: `5432`
   - Username: `postgres`
   - Password: `postgres`
   - Save password: Yes
5. Click **Save**
6. Expand: `FERILO Local` → `Databases` → `ferilo` → `Schemas` → `public` → `Tables`

You can browse `categories`, `users`, etc.

### Stop / start Docker database later

```powershell
docker compose stop      # stop
docker compose start     # start again
docker compose down      # stop and remove container (data kept in volume)
```

---

## Option B — pgAdmin only (without Docker)

If you installed PostgreSQL directly on Windows:

1. Open pgAdmin → connect to your local server
2. Right-click **Databases** → **Create** → **Database** → name: `ferilo`
3. Set `.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ferilo
```

4. Run `npm run db:setup`

---

## Later — free deploy with Neon (cloud PostgreSQL)

When you deploy for free, Neon is a good choice: https://neon.tech

### Step 1: Create Neon project

1. Sign up at https://neon.tech
2. Create a project (e.g. `ferilo`)
3. Copy the **connection string** (looks like):

```
postgresql://user:password@ep-xxxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### Step 2: Use Neon in production `.env`

On your host (Railway, Render, etc.) set:

```env
DATABASE_URL=your-neon-connection-string
```

### Step 3: Run migrations against Neon (once)

From your PC:

```powershell
$env:DATABASE_URL="your-neon-connection-string"
npm run db:setup
```

Or use Neon SQL Editor → paste contents of `database/schema.sql` then `database/seed.sql`.

---

## Website backup data (Neon / Render cold start)

Free Neon and Render tiers can **sleep** when idle. First request may take several seconds.

FERILO includes portfolio **offline preview** data for:

- Categories, cities, products, featured listings
- Favorites, offers, messages, orders, notifications, reports
- Admin stats / sample users

Behavior:

1. **Instant:** show hardcoded backup data and badge **Offline preview — connecting…**
2. **Background:** try the live API (8s timeout) and retry periodically
3. **When API/DB responds:** switch to real data and badge **Live from database**
4. **Login while offline:** any login/register that times out opens a demo session so dashboard pages still work for portfolio demos

Writes (create listing, place order, etc.) are blocked in offline demo mode with a clear message.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ECONNREFUSED` on port 5432 | Run `docker compose up -d` or start PostgreSQL service |
| `password authentication failed` | Check password in `DATABASE_URL` matches Docker (`postgres`) or your pgAdmin password |
| `database "ferilo" does not exist` | Docker creates it automatically; for pgAdmin create it manually |
| `relation "categories" does not exist` | Run `npm run db:setup` |
| Categories 503 but health works | Database not running or wrong `DATABASE_URL` |

---

## Quick command cheat sheet

```powershell
docker compose up -d          # start database
npm run db:setup                # create tables + seed
npm run dev                     # start website + API
docker compose stop             # stop database
```
