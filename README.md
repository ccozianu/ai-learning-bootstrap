# AI Learning

An invitation-only starting point for a learning application. The first version
provides accounts, Google sign-in, optional username/password sign-in, and a
small signed-in account page. Learning features come later.

All authored application and tooling code is TypeScript. React/Vite serves the
frontend; Fastify serves REST and GraphQL (Mercurius); Prisma 7 maps PostgreSQL.
SQL, CSS, HTML and configuration files are the appropriate declarative formats.

Canonical repository: [ccozianu/ai-learning-bootstrap](https://github.com/ccozianu/ai-learning-bootstrap).

## Open in DevCapsule and VSCodium

From this repository's root, with DevCapsule 0.3.0rc2 or later:

```sh
devcapsule project config capabilities --local frontend-ide codex-agent
devcapsule project config check
devcapsule project config resolve
```

`frontend-ide` selects VSCodium. Review and answer the permissions and software
acquisition questions printed by `resolve`, then run `devcapsule project run`.
The shared manifest requires the PostgreSQL client. Node 22 is supplied by the
pinned base; `package.json` declares Node >=22.12 and <23. Do not launch a Docker
PostgreSQL instance for this project: the owner supplies the database.

Inside the new capsule:

```sh
npm ci
npm run check
```

VSCodium tasks provide **AI Learning: dev** and **AI Learning: check**. The launch
configuration debugs the API in the integrated terminal. Required variables must
be in that process's environment; the project does not auto-read `.env`.

## First local setup

1. Copy `config/approved-gmail.example.txt` to `config/approved-gmail.txt` and
   add approved Gmail addresses, one per line. The live list is ignored by Git.
   Missing or empty lists deny everyone. Non-Gmail addresses are refused.
   Addresses are trimmed and lowercased, but dots and plus aliases are not folded.
2. In your own capsule terminal, supply the variables named in `.env.example`.
   Use **POSTGRES_DB**, **POSTGRES_USER**, **POSTGRES_PASSWORD**, **POSTGRES_HOST**,
   and optionally **POSTGRES_PORT** (5432). Use `POSTGRES_SSL=true` when required;
   TLS verifies certificates. For a private CA, set `NODE_EXTRA_CA_CERTS` before
   starting Node. Do not put credentials in chat, Git, shell arguments or logs.
3. Register a Google OAuth web client. For local development, authorize the exact
   redirect URI `http://localhost:5173/api/auth/google/callback`. Set
   `APP_ORIGIN=http://localhost:5173` and supply the client ID and secret locally.
4. Set `AUTH_SECRET` to a random secret of at least 32 characters, generated
   locally. Configure SMTP settings and a permitted sender. Port 587 uses
   STARTTLS; `SMTP_SECURE=true` uses implicit TLS, normally on port 465.
   Credentials are required by this first-cut SMTP adapter. No email is sent
   during installation, tests, or schema generation.
5. Review `prisma/migrations/0001_initial/migration.sql`. The owner executes it
   once against an unused `ai_learning` schema in the supplied database. From
   the capsule terminal, the local script can apply it transactionally:

   ```sh
   npm run db:apply -- --confirm-initial-schema
   ```

   This is a manual operation. The script reads environment variables inside
   Node, never prints a DSN, and suppresses raw errors. It rolls back on failure.
   Running it against an existing installation fails instead of dropping data.
   The agent has **not** run it against a real database. Do not use `db push`
   or `migrate deploy` on this manual-SQL baseline. Later migrations need an
   explicit baseline plan; the initial script does not create Prisma's migration
   history table.
6. Run `npm run dev` and open `http://localhost:5173`. The API listens on
   loopback port 3000 and Vite proxies `/api` and `/graphql`. Sign up with Google
   using an approved address, then optionally add username/password sign-in.

You can preview the sign-in UI without credentials with `npx vite --host
127.0.0.1`; authentication requires the configured API.

## Authentication behavior

- Google is the only signup path. A verified, allowlisted Gmail identity creates
  and activates a user. Google subject is the stable identifier.
- Password setup requires a Google-authenticated session less than ten minutes
  old. Passwords use Argon2id. Credential versions prevent stale in-flight login attempts from restoring
  access after revocation. Updating credentials invalidates old sessions,
  challenges and remembered browsers. Google is the first-cut recovery path.
- Password sign-in on an unremembered browser emails a six-digit code, valid for
  ten minutes and at most five verification attempts. Requesting another code
  replaces the prior one. Codes are stored as keyed hashes, never returned by
  the API or logged.
- The user may opt to remember a browser for 30 days. This suppresses the email
  step, not the password. The separate login session lasts one day. Tokens are
  random; the database stores only their SHA-256 hashes. Logout ends the current
  session; **Forget all browsers & sign out** revokes all sessions and devices.
- Cookies are HttpOnly and SameSite=Lax, Secure with `__Host-` names on HTTPS.
  HTTP cookies are for loopback development only. Every mutation requires the
  configured exact Origin; authentication endpoints have rate limits.
- Removing an address from the allowlist, or setting `users.active=false`, denies
  access on subsequent authenticated requests. The UI exposes only the current
  user's safe fields; there is no public users-directory endpoint.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Process liveness; does not assert database readiness |
| `GET /api/me` | Current user, authenticated |
| `GET /api/auth/google` | Google authorization with state, nonce and PKCE |
| `GET /api/auth/google/callback` | Verify Google identity and allowlist |
| `POST /api/auth/password/setup` | `{username, password}` after recent Google login |
| `POST /api/auth/password` | `{username, password}`; session or challenge ID |
| `POST /api/auth/password/confirm` | `{challengeId, code, remember}` |
| `POST /api/auth/logout` | End current session |
| `POST /api/auth/forget-browsers` | Revoke all sessions and trusted browsers |
| `POST /graphql` | Query `{ me { id email username signInTypes lastSignInType } }` |

Both APIs enforce the same session and approval policy. Auth orchestration is
REST; GraphQL exposes the first domain query. GraphiQL and arbitrary user lookup
are not enabled. No cross-origin deployment is configured.

## Validation and production boundary

`npm run check` generates Prisma types, checks TypeScript, builds the frontend,
and runs auth route tests against mocked persistence. `npm run test:ui` runs
recorded desktop/mobile browser flows with mocked API replies. Install Chromium
with `npx playwright install chromium` if not already available. To reuse an installed Chromium, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path. Evidence is in
ignored `test-results/`. These checks do not establish live Google, SMTP,
PostgreSQL, or capsule-launch acceptance.

`npm run db:sql` regenerates the initial SQL from the schema without a database
or secret-bearing environment. Review changes before handing them to the owner.

For an eventual deployment, build first and start with `NODE_ENV=production npm
start`, an HTTPS `APP_ORIGIN`, and an HTTPS reverse proxy to the loopback API.
Fastify then serves `dist/` and the API from one origin. Reverse-proxy rate-limit
identity, operational logging, expired-row cleanup, SMTP deliverability, live
provider testing and deployment approval remain separate work. Do not deploy
this bootstrap as an accepted production authentication service yet.

Read [DEVELOPING.md](DEVELOPING.md), [current status](CURRENT-STATUS.md),
[requirements](REQUIREMENTS.md), [local workflow](WORKFLOW-LOCAL.md), and
[documentation index](index.md) before extending it.
