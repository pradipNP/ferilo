# Development Guide

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:frontend` | Frontend only (port 5173) |
| `npm run dev:backend` | Backend only (port 5000) |
| `npm run build` | Build both workspaces |
| `npm run lint` | Lint both workspaces |
| `npm run db:migrate` | Apply database/schema.sql |
| `npm run db:seed` | Seed categories, delivery rates, admin user |
| `npm run db:setup` | Migrate + seed |

## Git workflow

- `main` — stable branch
- `feature/*` — feature branches per module
- Conventional Commits: `feat(auth): ...`, `fix(orders): ...`

## Phase workflow

1. Explain what we're building
2. Implement
3. Run tests / lint / build
4. Summarize changes
5. Provide Git commit command
6. **Wait for confirmation** before next phase

## Current phase

**Phase 7 complete** — Product listings: create, edit, publish, images, browse, detail.

**Next: Phase 8** — Search and filter system.
