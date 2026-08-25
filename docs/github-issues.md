# GitHub issues to open (FERILO)

Copy each block into **GitHub → Issues → New issue**, or create them with `gh` after installing GitHub CLI.

Suggested labels: `good first issue`, `documentation`, `enhancement`, `bug`, `help wanted`, `ui`, `backend`, `frontend`

---

## 1. [good first issue][docs] Improve README troubleshooting for cold starts

**Title:** docs: add FAQ for Neon/Render cold start and offline preview badge

**Body:**
```md
### Problem
New visitors may think the app is broken when they see **Offline preview — connecting…** while Render/Neon wake up.

### Proposed change
- Add a short FAQ under Live demo / Troubleshooting in README
- Explain 30–60s cold start, badge meaning, and when to hard-refresh
- Link to `docs/deployment.md`

### Acceptance criteria
- [ ] FAQ section added
- [ ] Mentions `CLIENT_URL` trailing-slash CORS pitfall
- [ ] Mentions `VITE_API_URL` must be set at Cloudflare build time

### Labels
`good first issue`, `documentation`
```

---

## 2. [good first issue][ui] Soften remaining “verified marketplace” marketing copy

**Title:** ui: align remaining marketing copy with “in-app verification ≠ government license”

**Body:**
```md
### Context
README/About already clarify verification is a platform feature, not government approval. Some UI strings may still read as official certification.

### Tasks
- Search frontend for user-facing phrases like “Nepal's verified marketplace”
- Prefer wording such as “identity-checked sellers” / “community marketplace demo”
- Keep functional badges (`Verified seller`) that mean FERILO review status

### Acceptance criteria
- [ ] No wording that implies government licensing
- [ ] Screenshots/docs still make sense

### Labels
`good first issue`, `ui`, `frontend`
```

---

## 3. [good first issue][docs] Add CONTRIBUTING quick-start GIF or numbered screenshots

**Title:** docs: add a 5-step visual local setup guide

**Body:**
```md
### Goal
Help first-time contributors run FERILO faster.

### Ideas
- Numbered steps: clone → `.env` → `db:up` → `db:setup` → `npm run dev`
- Optional: short GIF or link to existing `assets/screenshots`

### Acceptance criteria
- [ ] Steps work on Windows PowerShell and bash
- [ ] Mentions demo accounts from README

### Labels
`good first issue`, `documentation`
```

---

## 4. [enhancement][frontend] Empty states when live API returns 0 listings

**Title:** feat(ui): friendlier empty state for browse/home when DB has no products

**Body:**
```md
### Problem
If Neon has categories but 0 products, the UI can look “broken” even with **Live from database**.

### Proposal
- Show a clear empty state: “No listings yet” + tip to run `npm run db:seed-products`
- Keep offline fallback behavior unchanged

### Acceptance criteria
- [ ] Browse and featured sections handle `total === 0` gracefully
- [ ] Copy points maintainers/contributors to seed command

### Labels
`enhancement`, `frontend`, `help wanted`
```

---

## 5. [enhancement][backend] Unlock-admin script / endpoint for demo resets

**Title:** feat(auth): add maintainer script to unlock demo admin after lockout

**Body:**
```md
### Problem
Demo login hits `ACCOUNT_LOCKED` after 5 failed attempts (15 min lock). Contributors hitting wrong password get stuck.

### Proposal
- Add `npm run db:unlock-demo` (or document SQL in README) to reset `failed_login_attempts` / `locked_until` for demo emails
- Optionally reset demo passwords to documented defaults

### Acceptance criteria
- [ ] Safe for local + Neon when `DATABASE_URL` is set
- [ ] Documented in README or `docs/development.md`

### Labels
`enhancement`, `backend`, `good first issue`
```

---

## 6. [enhancement] Add GitHub Issue / PR templates

**Title:** chore: add issue and pull request templates

**Body:**
```md
### Goal
Standardize contributions.

### Tasks
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

### Acceptance criteria
- [ ] Templates appear when opening issues/PRs
- [ ] Ask for environment (local vs https://ferilo.pages.dev)

### Labels
`enhancement`, `documentation`, `good first issue`
```

---

## 7. [enhancement][testing] Expand backend tests for auth lockout and products list

**Title:** test: cover login lockout and empty products list meta

**Body:**
```md
### Goal
Improve confidence for contributors.

### Ideas
- Unit/integration tests for failed login counting / lock
- Assert products list returns `meta.total` correctly when empty

### Labels
`enhancement`, `backend`, `help wanted`
```

---

## 8. [enhancement] Persist uploads to R2/S3 for production demos

**Title:** feat(storage): optional Cloudflare R2 / S3 for product images

**Body:**
```md
### Problem
Render free disk is ephemeral; local `/uploads` don’t survive deploys.

### Proposal
- Optional S3-compatible storage behind env vars
- Keep local filesystem for development

### Labels
`enhancement`, `backend`, `help wanted`
```

---

## 9. [bug] Confirm CORS + cookie notes stay accurate after Pages custom domains

**Title:** docs/bug: document CORS checklist when adding a custom domain

**Body:**
```md
### Context
`CLIENT_URL` must exactly match browser Origin (no trailing slash). Custom domains will break login if Render env isn’t updated.

### Tasks
- Document checklist in `docs/deployment.md`
- Optional: allow multiple origins via env list

### Labels
`bug`, `documentation`, `backend`
```

---

## 10. [help wanted] Accessibility pass on browse filters and product cards

**Title:** a11y: improve keyboard and screen-reader support on browse UI

**Body:**
```md
### Goal
Make browse/filters/product cards more accessible.

### Ideas
- Focus styles, aria-labels on favorite/search controls
- Ensure filter form is operable by keyboard only

### Labels
`help wanted`, `ui`, `frontend`, `good first issue`
```

---

## Create with GitHub CLI (after install)

```powershell
winget install --id GitHub.cli -e
# restart terminal, then:
gh auth login
cd D:\Web_Projects\Ferilo
```

Then create labels + issues (example):

```powershell
gh label create "good first issue" -c "7057ff" -d "Good for newcomers" 2>$null
gh label create "help wanted" -c "008672" 2>$null
gh label create "ui" -c "f9d0c4" 2>$null
gh label create "frontend" -c "a2eeef" 2>$null
gh label create "backend" -c "5319e7" 2>$null

gh issue create --title "docs: add FAQ for Neon/Render cold start and offline preview badge" --label "good first issue,documentation" --body-file - <<'EOF'
...paste body...
EOF
```
