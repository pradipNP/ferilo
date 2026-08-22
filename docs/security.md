# Security

## Authentication

- bcrypt password hashing (cost 12)
- JWT access + refresh token rotation
- Refresh token in HttpOnly, Secure, SameSite=Strict cookie
- Account lockout after repeated failed logins

## Identity documents

- Stored in private filesystem path (dev) / encrypted object storage (prod)
- Only metadata in PostgreSQL (`storage_key`, hash, mime, size)
- Never exposed via public APIs
- Admin access via short-lived signed URLs with audit logging
- Retention: delete rejected docs after 90 days

## Input & output

- Parameterized SQL only
- Zod validation on all endpoints
- Helmet, CORS whitelist, rate limiting
- No stack traces in production
- Sanitize user-generated content (messages, reviews)

## Uploads

- Magic-byte validation (not MIME header alone)
- Size limits enforced server-side
- Random UUID filenames
- Product images public; identity docs private

## Authorization

- RBAC: USER, ADMIN
- IDOR prevention in service layer on every resource access
- Admin actions logged in `audit_logs`
