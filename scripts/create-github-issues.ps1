# Create FERILO GitHub issues (run after: gh auth login)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

function Ensure-Label($name, $color, $description) {
  gh label create $name --color $color --description $description 2>$null | Out-Null
}

Write-Host "Creating labels (ok if they already exist)..."
Ensure-Label "good first issue" "7057ff" "Good for newcomers"
Ensure-Label "help wanted" "008672" "Extra attention is needed"
Ensure-Label "documentation" "0075ca" "Improvements or additions to docs"
Ensure-Label "enhancement" "a2eeef" "New feature or request"
Ensure-Label "bug" "d73a4a" "Something isn't working"
Ensure-Label "ui" "f9d0c4" "User interface"
Ensure-Label "frontend" "61dafb" "Frontend / React"
Ensure-Label "backend" "5319e7" "Backend / API"

function New-Issue($title, $labels, $body) {
  $tmp = New-TemporaryFile
  Set-Content -Path $tmp -Value $body -Encoding utf8
  gh issue create --title $title --label $labels --body-file $tmp
  Remove-Item $tmp -Force
}

Write-Host "Creating issues..."

New-Issue "docs: add FAQ for Neon/Render cold start and offline preview badge" "good first issue,documentation" @"
### Problem
New visitors may think the app is broken when they see **Offline preview — connecting…** while Render/Neon wake up.

### Proposed change
- Add a short FAQ under Live demo / Troubleshooting in README
- Explain 30–60s cold start, badge meaning, and when to hard-refresh
- Link to ``docs/deployment.md``

### Acceptance criteria
- [ ] FAQ section added
- [ ] Mentions ``CLIENT_URL`` trailing-slash CORS pitfall
- [ ] Mentions ``VITE_API_URL`` must be set at Cloudflare build time

Live demo: https://ferilo.pages.dev
"@

New-Issue "ui: align remaining marketing copy with in-app verification (not government license)" "good first issue,ui,frontend" @"
### Context
README/About clarify verification is a platform feature, not government approval. Some UI strings may still sound official.

### Tasks
- Search frontend for phrases like “Nepal's verified marketplace”
- Prefer “identity-checked sellers” / “community marketplace demo”
- Keep functional badges (``Verified seller``) that mean FERILO review status

### Acceptance criteria
- [ ] No wording that implies government licensing
- [ ] UI still clear for buyers/sellers
"@

New-Issue "docs: add a 5-step visual local setup guide" "good first issue,documentation" @"
### Goal
Help first-time contributors run FERILO faster.

### Ideas
- Numbered steps: clone → ``.env`` → ``db:up`` → ``db:setup`` → ``npm run dev``
- Optional: reference ``assets/screenshots``

### Acceptance criteria
- [ ] Steps work on Windows PowerShell and bash
- [ ] Mentions demo accounts from README
"@

New-Issue "feat(ui): friendlier empty state when live DB has zero listings" "enhancement,frontend,help wanted" @"
### Problem
If Neon has categories but 0 products, the UI can look broken even with **Live from database**.

### Proposal
- Clear empty state: “No listings yet”
- Tip for maintainers: ``npm run db:seed-products``

### Acceptance criteria
- [ ] Browse / featured handle empty lists gracefully
- [ ] Offline fallback behavior unchanged
"@

New-Issue "feat(auth): maintainer script to unlock demo accounts after lockout" "enhancement,backend,good first issue" @"
### Problem
Demo login returns ``ACCOUNT_LOCKED`` after 5 failed attempts (15 min). Contributors get stuck.

### Proposal
- Add ``npm run db:unlock-demo`` (or similar) to reset ``failed_login_attempts`` / ``locked_until`` for demo emails
- Document in README / ``docs/development.md``

### Acceptance criteria
- [ ] Works with local and Neon ``DATABASE_URL``
- [ ] Documented for maintainers
"@

New-Issue "chore: polish issue/PR templates and contribution labels" "enhancement,documentation,good first issue" @"
### Goal
Templates already exist under ``.github/ISSUE_TEMPLATE``. Improve them and add a PR template if missing.

### Tasks
- Review bug / feature / good-first templates
- Add ``.github/PULL_REQUEST_TEMPLATE.md`` if absent
- Ensure templates ask for local vs live demo environment

### Acceptance criteria
- [ ] Opening an issue shows useful templates
- [ ] PR template lists lint/test checklist
"@

New-Issue "test: cover login lockout and empty products list meta" "enhancement,backend,help wanted" @"
### Goal
More tests for safer contributions.

### Ideas
- Failed login counting / account lock
- Products list returns ``meta.total`` correctly when empty

### Acceptance criteria
- [ ] ``npm test`` covers new cases
- [ ] No flaky network dependencies
"@

New-Issue "feat(storage): optional S3/R2 uploads for production product images" "enhancement,backend,help wanted" @"
### Problem
Render free disk is ephemeral; ``/uploads`` do not survive deploys.

### Proposal
- Optional S3-compatible storage via env vars
- Keep local filesystem for development
- Current seed uses picsum URLs — keep that for demos

### Labels context
Larger task — discuss design in comments before big PR.
"@

New-Issue "docs: CORS checklist when adding a custom domain to Cloudflare Pages" "documentation,bug,backend" @"
### Context
``CLIENT_URL`` must exactly match browser Origin (no trailing slash). Custom domains break login if Render env is stale.

### Tasks
- Document checklist in ``docs/deployment.md``
- Optional enhancement: support multiple allowed origins

### Acceptance criteria
- [ ] Checklist includes CLIENT_URL, cookie SameSite, and rebuild notes
"@

New-Issue "a11y: improve keyboard and screen-reader support on browse UI" "help wanted,ui,frontend,good first issue" @"
### Goal
Make browse/filters/product cards more accessible.

### Ideas
- Visible focus styles
- aria-labels on favorite / search controls
- Filters fully keyboard operable

### Acceptance criteria
- [ ] Can browse and filter without a mouse
- [ ] No regressions on mobile layout
"@

Write-Host "Done. Open: https://github.com/pradipNP/ferilo/issues"
