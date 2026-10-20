# Security and Deployment Notes

- The delivered archive intentionally excludes the supplied `.env` because it contains database/auth secrets. Copy `.env.example` to `.env` locally and provide fresh values. Rotate any credential that was ever committed or shared.
- Configure `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` for the target environment. Never commit real values.
- Use a dedicated non-production database for migrations and demos. Take a backup before any migration on shared environments.
- Verify company/factory scoping and permission checks with users from at least two companies before release.
- Store uploaded documents in private object storage; validate MIME type, size, access, retention and expiry. Avoid public arbitrary URLs for sensitive documents.
- Configure TLS, secure cookies, rate limits, monitoring, backups and tested restore procedures at deployment.
- Use a staging deployment before production. This source archive has not been certified as production-ready.
