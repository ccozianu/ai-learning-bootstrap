# Bootstrap decisions

Status: accepted for owner choices; implementation choices noted separately.
Decided by: product owner, console answers confirmed in chat, 2026-10-22.

- Parent routing: sample-projects in a clean checkout rather than editing the
  maintenance checkout. The latter's commits and IDE changes are preserved.
- Repository: use an existing remote rather than create a new hosted repository.
  Its URL remains pending; do not invent a submodule URL.
- Registration: Google first, optional password setup on the same account,
  rather than independent username/password registration.
- Confirmation: email rather than an authenticator app, with the offered 30-day
  remembered-browser duration. Mail service details remain pending.
- Database names: standard POSTGRES_* spelling. The owner's written correction
  overrides the contradictory radio selection of the double-S spelling.

Implementation choices: React/Vite and Fastify/Mercurius, pinned Prisma 7.10.1
rather than the registry's Prisma 8 prerelease. SMTP is an adapter boundary,
not a provider choice. One-day sessions, ten-minute codes, five code attempts,
Argon2id, a dedicated ai_learning database schema, and recent Google login for
password setup are initial implementation defaults and may be revised after
acceptance. Sign-in methods are an array because an account may have both.

Reference contracts consulted:
- [Prisma 7 setup and SQL diff](https://www.prisma.io/docs/v7/prisma-orm/add-to-existing-project/postgresql)
- [Google OpenID Connect server flow](https://developers.google.com/identity/openid-connect/openid-connect)
- [Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/)
