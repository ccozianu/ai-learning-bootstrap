# Fixed Technology Choices & Rationale

> **Status: `Accepted (v1.3 — 2026-11-16)`** — part of
> [Project Elements Overview](../project-elements-overview.md) and
> [Edge Auth, IAP Handshake & Disconnected Club Contracts](edge-and-sync-contracts.md).

## Version Evolution Policy

Package and framework choices listed below are **fixed**, while **specific
package versions may and shall evolve over time** (the pinned versions in
`package.json` reflect the Cut 1 bootstrap baseline, not a permanent version
freeze).

## Fixed Stack & Rationale

| Layer | Fixed Choice | Rationale |
| --- | --- | --- |
| **Language & Runtime** | **TypeScript** on **Node.js** | Single type-safe language across frontend, backend, Prisma client, and tooling scripts; catches contract mismatches at compile time. |
| **Frontend** | **React** + **Vite** | Component ecosystem for `CurriculumSeries` templates, `pyret-embed`, and management UIs; `dist/` served behind IAP (by Fastify or NGINX). |
| **Backend HTTP & REST** | **Fastify** on **Cloud Run** | TypeScript-friendly HTTP server on Cloud Run serverless NEGs behind GCP LB + IAP (`max_instances` caps), handling dual-audience IAP JWT verification, cookies, helmet, rate limiting, and auth/sync REST routes. |
| **GraphQL API** | **Mercurius** (`graphql`) | Native Fastify GraphQL adapter sharing the same auth/session policy and origin/rate-limit middleware as REST. |
| **Database** | **PostgreSQL** (externally supplied, `ai_learning` schema) | Single source of truth: relational integrity, transactions, `KnowledgeDependency` DAG now, and optional `pgvector` embeddings for the multilingual RAG roadmap. |
| **ORM & Migrations** | **Prisma** (`@prisma/adapter-pg` + `pg`) | Type-safe schema-first modeling and generated client. *(Requires an explicit `_prisma_migrations` baseline over Cut 1's manual SQL before Phase 1 migrations.)* |
| **Password Hashing** | **Argon2id** (`argon2`) | Memory-hard password hashing (`19456` KiB, `t=2`, `p=1`); stored as PHC `passwordHash` in PostgreSQL, and parsed into raw bytes + `argon2Parameters` for GCIP REST `projects.tenants.accounts:batchCreate` when syncing offline resets (`<= 32768` KiB ceiling). |
| **Email Transport** | **Nodemailer** (SMTP adapter boundary) | Decouples 2FA and notification delivery from any single SMTP provider. |
| **Testing** | **Vitest** + **Playwright** | Fast in-process unit/route testing (with deterministic offline IAP/GCIP mocks) and desktop/mobile browser flow testing. |
| **Dev Environment** | **DevCapsule** + **VSCodium** | Reproducible capsule toolchain with strict host/credential isolation. |

## Fixed Architectural & Runtime Boundaries

- **Domains & Edge Gate (`learning.mycodespace.ai` / `test-learning.mycodespace.ai`):**
  - GCP HTTPS Load Balancer (frontend mTLS `ALLOW_INVALID_OR_MISSING_CLIENT_CERT`
    + `X-Client-Cert-*` custom headers) + Cloud Armor + **Cloud Run** + IAP
    (External Identities) + GCIP (`applicants`, `supervisors`, single global
    `students` tenant with **Email Enumeration Protection enabled**) + Cloud Run
    NGINX `signin-ui` (`auth.*`) protect `open.*`, `auth.*`, `app.*`, and
    `<club>.*` (e.g., `galati-ro.learning.mycodespace.ai`), plus mTLS `sync.*`.
  - **PostgreSQL + Fastify is the single source of truth** (owning Cut 1's
    `Challenge` parent-2FA, `TrustedDevice`, `OnboardingRequest`, GDPR consent,
    and `accountStatus` via `/api/auth/iap/exchange`, with one-way sync to GCIP).
- **On-Site Club Server & Specialized Coding Runtimes (No Moodle / No Authentik):**
  - Offline-resilient cache (`club_cache`, `24–72h` hash TTL) + `clientEventId`
    outbox sync on the on-site server (`i7 / 128 GB`) with a **delegated
    per-`Location` Ed25519 signing keypair** for local JWT minting.
  - **`pyret-embed` + `pyret-npm`** (browser-side interactive runs; isolated
    **Cloud Run** worker service for authoritative server grading) + self-hosted
    Bootstrap modules (`include url(...)`) for ages `11–15`; **`DevCapsule /
    code-server`** containers for `15–18`; optional local **Hedy** station for
    `7–11`.
- **LLM Resource Abstraction:** Configured resource accepting `(question,
  context)` and returning `answer`, backed by adult-only cloud APIs (Gemini/Vertex
  prohibited for `<18` / student work), self-hosted `vLLM`, Anthropic
  minors-compliant API (if Phase-2+ security-reviewed), or an on-site/local
  adult-authenticated bridge.

## Cut 1 → Phase 1 Technical Migration Checklist

- Freeze `prisma/migrations/0001_initial/migration.sql` (save frozen
  `prisma/snapshots/0001_initial.prisma` and stop `npm run db:sql` from
  overwriting `0001_initial`), establish `_prisma_migrations` baseline (noting
  `scripts/db-apply.ts` only executes `0001_initial` and does not write
  `_prisma_migrations`), update `prisma.config.ts` to compose the datasource URL
  from `POSTGRES_*` env vars (URL-encoding password, keeping `127.0.0.1:1` as
  offline fallback for `prisma migrate resolve`), and replace
  `scripts/schema-sql.ts`'s `=== 4` / `--from-empty` guard so `0002_*`
  migrations output to a new `0002_*` folder offline via
  `--from-schema <frozen-snapshot>` without a shadow database.
- Update `prisma/schema.prisma` & `src/app.ts`: make `User.email` and
  `googleSubject` nullable (and Mercurius `email: String`), extend `SignInType`
  enum for GCIP/IAP and club-offline sign-ins, remove `signInTypes` /
  `lastSignInType` `[GOOGLE]` defaults for kids, backfill `active` into
  `accountStatus` before dropping `active` (single status field), resolve kid
  2FA to `guardianUserId`'s verified `ACTIVE` email, replace `approved()`
  reading `config/approved-gmail.txt` on disk with PostgreSQL checks, relax
  `@gmail.com`-only validation (`src/security.ts`) for verified Google
  Workspace accounts, make `GOOGLE_CLIENT_ID`/`SECRET` optional in IAP prod
  mode, add `AUTH_MODE` / IAP audiences / GCIP tenant / club mTLS config in
  `src/config.ts`, and retire Cut 1's direct `/api/auth/google*` and adult
  local-password login in IAP prod mode (keeping them for local DevCapsule dev
  mode).
- Add idempotent `scripts/bootstrap-admin.ts` to seed initial `ADMIN` access.
- Update `src/app.ts`: lift `bodyLimit: 8192`, configure exact `trustProxy` hop
  count behind GCP LB/IAP, replace in-memory rate-limit store with
  distributed/edge-backed limits, update Fastify Helmet CSP for `pyret-embed` /
  Bootstrap modules (FirebaseUI lives on NGINX `signin-ui`), validate
  multi-origin (`open.*`, `app.*`, active `<club>.*`) with `/api/club/sync/*`
  mTLS Origin-CSRF exemption, add SPA fallback for `@fastify/static` (excluding
  `/api/*` and `/graphql`), add `GET /api/ready` (`SELECT 1`), raise Mercurius
  `queryDepth` beyond `3`, and map `401`/`403`/`429` cleanly instead of
  collapsing GraphQL errors to `400`.
- Fix `package.json` `"format"` script glob from `"src/*.ts"` to `"src/**/*.ts"`.
- Keep offline test doubles in `npm run check` for IAP/GCIP and the
  `pyret-npm` isolated grading worker.

## Deferred Areas
- **Phase-2+ security-gated student AI** (`tutor`, `pair-programmer`,
  `FREE_FORM_PROOF` LLM grading), **tablet/browser passwordless kid auth**, and
  **payment/billing gateway** — deferred; concrete implementation options live in
  [Areas Open for LLM / Agent Proposals](llm-discretion.md).
