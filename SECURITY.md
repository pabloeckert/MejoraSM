# 🔒 Security Policy — MejoraSM

## Reporting Vulnerabilities

If you discover a security issue, **do NOT open a public GitHub issue.**

Contact directly:
- **Email:** [Pablo Eckert — pablo@mejoraok.com]
- **Subject:** `[SECURITY] MejoraSM — [brief description]`

We'll respond within 48 hours and work on a fix.

---

## Security Measures

### Authentication
- Supabase Row Level Security (RLS) enabled on all tables
- Edge Functions validate Authorization headers
- API keys stored as Supabase secrets (never in code)

### Data Protection
- `.env` files excluded via `.gitignore`
- No credentials in code, comments, or documentation
- CORS restricted to allowed origins (not `*`)
- Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy

### API Keys
- All AI provider keys stored as Supabase Edge Function secrets
- Keys rotated if exposure is suspected
- Rate limiting implemented with exponential backoff

### Dependencies
- `npm audit` run periodically
- Dependabot enabled for security updates
- Lock file (`package-lock.json`) committed

---

## Known Security Issues

| Issue | Severity | Status | Notes |
|---|---|---|---|
| RLS "Allow all" policies | 🔴 High | Planned | Post-MVP, requires auth implementation |
| `.env` with real credentials in git history | 🔴 Critical | Pending | Needs credential rotation + history cleanup |

---

## Security Checklist for Contributors

- [ ] Never commit `.env` files or real credentials
- [ ] Never log API keys or secrets
- [ ] Always validate user input in Edge Functions
- [ ] Use parameterized queries (Supabase client handles this)
- [ ] Test with least-privilege access
- [ ] Review CORS origins before adding new domains

---

## Dependency Security

```bash
# Check for vulnerabilities
npm audit

# Fix automatically when possible
npm audit fix

# Force fix (review changes first)
npm audit fix --force
```

---

MejoraOK © 2026 — All rights reserved.
