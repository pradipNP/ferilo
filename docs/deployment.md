# Deployment

> Full deployment instructions will be added in **Phase 22**.

## Target stack (planned)

- **Frontend**: Static build served via CDN or Nginx
- **Backend**: Node.js process (PM2 or Docker)
- **Database**: Managed PostgreSQL
- **Storage**: S3-compatible object storage for images & identity docs
- **Reverse proxy**: Nginx with TLS

## Environment

- Set all variables from `.env.example` in production secrets manager
- `NODE_ENV=production`
- Strong random `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Never expose identity document storage publicly

## CI/CD (planned)

- Lint + test on pull request
- Build Docker images on merge to `main`
- Run migrations before deploy
