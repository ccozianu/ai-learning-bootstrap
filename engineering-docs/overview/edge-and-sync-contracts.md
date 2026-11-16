# Edge Auth, IAP Handshake & Disconnected Club Contracts

> **Status: `Accepted (v1.3 — 2026-11-16)`** — part of
> [Project Elements Overview](../project-elements-overview.md).

This document defines the exact runtime contracts between the GCP edge layer
(Load Balancer, Cloud Armor, Cloud Run, IAP, GCIP), the Fastify/PostgreSQL
backend, and the on-site club server (`i7 / 128 GB RAM`).

## 1. GCIP Tenants, Email Enumeration Protection & Argon2id Sync

- **Three GCIP tenants total (no per-club GCIP tenants):**
  1. `applicants` — Google SSO only; self sign-up enabled for `D-1` onboarding
     submissions on `open.*/api/*`. Stale `applicants` accounts with no open
     request activity for 30 days are purged periodically (MAU hygiene).
  2. `supervisors` — Google SSO only (for `ADMIN`, `PARENT`, `TEACHER`). Client
     self-sign-up is **disabled** (`beforeCreate` always rejects); on
     `OnboardingRequest` approval, Fastify's **one-way outbox** pre-creates the
     Google-linked user in `supervisors` via GCIP Admin SDK (`createUser`), and
     `beforeSignIn` checks active claims. Cut 1's adult username/password login
     is **retired in IAP production** (retained only in local DevCapsule dev
     mode when IAP is disabled).
  3. `students` — Email/password with client self-sign-up **disabled** (`beforeCreate`
     always rejects; accounts are provisioned in GCIP **only once**
     `accountStatus == ACTIVE` via one-way sync from PostgreSQL).
- **Mandatory GCIP Email Enumeration Protection (No Lookup Oracle):**
  - GCIP **Email Enumeration Protection must be explicitly enabled** on the
    Identity Platform project (and verified as a Phase-1 PoC acceptance check)
    so `auth.*` never distinguishes unknown accounts from invalid passwords.
  - Kid `username` must match `/^[a-z0-9_]{3,32}$/` (per Cut 1 `src/app.ts`) and
    is globally unique. `auth.*` (`signin-ui`, Cloud Run NGINX hosting
    FirebaseUI + `gcip-iap`) deterministically maps `username.trim().toLowerCase()`
    → `<normalized-username>@students.learning.mycodespace.ai` (owned
    non-deliverable subdomain) client-side and signs in against the single
    `students` tenant.
  - There is **no** unauthenticated `username -> club/tenant` lookup endpoint
    anywhere outside IAP.
- **Kid password policy & Argon2id → GCIP sync:**
  - Parent-managed passphrases must meet Cut 1's `12..128` character bounds
    (`src/app.ts`) and use Argon2id PHC `passwordHash` strings (Cut 1's `19456`
    KiB, `t=2`, `p=1` fits GCIP's `memoryCostKib <= 32768`, `t/p <= 16`
    ceilings).
  - **Online creation / online password resets:** push plaintext password via
    Admin SDK `createUser` / `updateUser` at action time, while storing PHC
    `passwordHash` in PostgreSQL.
  - **Offline club password resets (where only the synced PHC `passwordHash`
    exists):** parse the PHC string into raw hash + salt bytes and explicit
    `argon2Parameters` and sync to GCIP via the REST
    `projects.tenants.accounts:batchCreate` (upsert/overwrite) endpoint.

## 2. IAP Audience, Host/Origin, Route Classes & 2FA Handshake

1. **Five Explicit Route Auth Classes & IAP Claim Mapping:**
   - **Class 1 — Public Liveness/Readiness:** `GET /api/health`, `GET /api/ready`
     (`SELECT 1` DB check).
   - **Class 2 — Onboarding (`open.* /api/*`, `aud == open_backend`, `tenant == applicants`):**
     - Requires IAP JWT with `aud == open_backend_service_id` and
       `gcip.firebase.tenant == applicants`. No `__Host-ai-session` required.
     - `open.*` static landing pages trigger a **top-level browser navigation**
       (e.g., button link to `/api/onboarding/session?returnTo=...`) rather than
       background `fetch`, avoiding cross-origin CORS/302 drops before IAP
       session establishment.
   - **Class 3 — App Pre-Session & Logout (`app.*` / `<club>.*`, `aud == app_backend`):**
     - `/api/auth/iap/exchange`, `/api/auth/challenge/*`, `/api/auth/logout`.
     - Requires valid IAP JWT (`aud == app_backend_service_id`, shared by
       `app.*` and `<club>.*`) with `gcip.firebase.tenant` ∈ `{supervisors, students}`.
     - **Exact IAP claim mapping:**
       - `supervisors`: extract raw Google subject from
         `gcip.firebase.identities["google.com"][0]` → match `User.googleSubject`.
       - `students`: match `User.gcipUid` (stored on one-way sync) or parsed
         username local-part from the synthetic email claim.
   - **Class 4 — Authenticated App & GraphQL (`app.*` / `<club>.*`):**
     - All other app REST/GraphQL endpoints **fail closed** unless **both** a
       valid `app_backend` IAP JWT **and** a valid `__Host-ai-session` cookie
       (matching PostgreSQL `accountStatus == ACTIVE` and current `authVersion`)
       are present.
   - **Class 5 — Club Server Sync (`sync.learning.mycodespace.ai`, `/api/club/sync/*`):**
     - Dedicated Cloud Run backend service behind Cloud Armor + **GCP LB
       frontend mTLS** (no browser IAP), exempt from browser `Origin` CSRF
       checks; Fastify authorizes exclusively on the LB-overwritten
       `X-Client-Cert-*` custom headers (verified against registered `Location`
       server certs).
2. **Dynamic `Host` / `Origin` Validation & `__Host-` Cookie Scope:**
   - `app.*` and active `<club>.*` subdomains share `app_backend_service_id`;
     Fastify validates `Host` and mutation `Origin` dynamically against `open.*`,
     `app.*`, and registered active `Location.slug` subdomains (rejecting
     `auth.*` as a mutation origin).
   - `__Host-ai-session` and `__Host-ai-device` cookies are intentionally
     per-origin (`app.*` vs. `<club>.*`).
3. **IAP → `__Host-ai-session` Exchange (No Password Re-Entry):**
   - On initial load without `__Host-ai-session`, the SPA calls
     `POST /api/auth/iap/exchange`:
     - Fastify checks `User.accountStatus == ACTIVE` (blocking
       `PENDING_PARENT_CONSENT`, `CONSENT_WITHDRAWN`, `SUSPENDED`, `ANONYMIZED`
       with `403`).
     - If the request carries a valid `TrustedDevice` cookie OR arrives from an
       attested `ClubDevice` during an active `LiveClassSession` for an
       **enrolled** student (`Enrollment` required; auto-records `Attendance` on
       login) **with a fresh IAP `auth_time` (`< 5 min`)**, Fastify issues
       `__Host-ai-session` immediately.
     - Outside an active `LiveClassSession` (e.g., unsupervised open-lab time),
       shared `ClubDevice`s do **not** bypass 2FA and still require parent-email
       code verification (without setting a `TrustedDevice` cookie).
     - Otherwise, Fastify creates a `Challenge` (10 min, max 5 attempts, 6-digit
       code emailed via Nodemailer to the adult's email or the kid's `guardianUserId`'s
       verified `ACTIVE` email) and returns `{ requires2fa: true, challengeId }`.
     - `POST /api/auth/challenge/confirm` verifies the code, issues
       `__Host-ai-session`, and sets a 30-day `TrustedDevice` cookie **only on
       personal/home browsers (never on shared `ClubDevice`s)**.
4. **Lockout, Logout, Cleanup & Revocation:**
   - GCIP handles edge password brute-force throttling on `auth.*` (PostgreSQL
     `passwordFailures`/`lockedUntil` retained for local DevCapsule dev mode).
   - `POST /api/auth/logout` clears `__Host-ai-session` (even if stale) and
     directs the browser to `/_gcp_iap/clear_login_cookie` + Firebase `signOut()`.
     Parent `forget-browsers` or Admin suspension increments `authVersion` and
     triggers one-way sync to revoke GCIP refresh tokens and set `disabled = true`.
   - Expired `OnboardingRequest` (30d), `Session`, `Challenge`, `TrustedDevice`,
     and stale `applicants` rows are ignored lazily on read and purged
     periodically.

## 3. Shared `ClubDevice` Attestation & Browser Isolation

- A `ClubDevice` 2FA exemption **cannot** be triggered by a client-supplied
  header, cookie, or query parameter.
- Because browser TLS to the GCP Load Balancer is end-to-end (so a plain LAN
  forward proxy cannot inject a client certificate), each registered
  `ClubDevice` holds an Admin/Teacher-provisioned **non-exportable client TLS
  certificate**. The single target HTTPS proxy uses **GCP LB frontend mTLS in
  `ALLOW_INVALID_OR_MISSING_CLIENT_CERT` mode** and injects LB-overwritten
  custom headers (`X-Client-Cert-Present`, `X-Client-Cert-SHA256`,
  `X-Client-Cert-Valid`); Fastify strips/ignores raw client values and trusts
  only the LB-injected headers (the same frontend mTLS proxy validates Class 5
  `sync.*`).
- Shared club laptops/tablets run managed ephemeral browser profiles (clearing
  cookies/storage on window close) + a prominent **Switch Student / End Session**
  button calling `/api/auth/logout` + `/_gcp_iap/clear_login_cookie`, backed by
  the `< 5 min` IAP `auth_time` freshness check above.

## 4. Disconnected Club Operation & Sync Outbox (`club_cache`)

- **Local Club Auth, URL/TLS & Delegated Keys:**
  - On-site servers register via **mTLS** against `sync.learning.mycodespace.ai`
    (`Class 5`).
  - Each on-site server holds its own **delegated Ed25519 signing keypair**
    (private key stays on-site; public key registered in cloud Fastify's JWKS
    for that `Location`) to mint short-lived local JWTs (`iss`, `aud`, `sub`,
    `locationId`, `role`, `exp`) for `DevCapsule / code-server` containers (via
    a lightweight authenticating reverse-proxy bridge in front of containers)
    and optional `Hedy`.
  - When cloud IAP is unreachable, club devices hit the local LAN portal
    (`https://club.<slug>.local` via local Caddy/NGINX with club CA). Both
    **kids** (via cached Argon2id `passwordHash`) and **cleared teachers** (via
    optional Argon2id `offlinePassphraseHash`) log in locally to receive local
    Ed25519 session JWTs; cached credentials expire strictly after **`24–72h`**
    without cloud sync.
- **Deterministic Outbox Reconciliation & Erasure Tombstones:**
  - Offline `ExerciseAttempt`, `Attendance`, `LiveClassSession` start/end,
    `AuditLog` events, offline LLM usage metering records, and offline teacher
    kid-password resets carry a club-generated **`clientEventId` UUID** for
    idempotent replay.
  - `PyretWorkspaceState` autosaves use `(baseRevision, updatedAt, contentHash)`;
    divergent offline edits (`cloud.revision > baseRevision`) are saved as a
    **non-destructive conflict copy** rather than overwriting home edits.
  - **Conflict precedence:** Cloud `ADMIN` suspension or cloud `PARENT` password
    reset takes precedence over offline teacher resets; offline teacher resets
    sync to GCIP via `projects.tenants.accounts:batchCreate` (`argon2Parameters`),
    and conflicted resets are logged in `AuditLog` and surfaced to the teacher UI.
  - **GDPR erasure sync:** Cloud pull payloads include **`ErasureTombstone`**
    records so offline `club_cache` nodes permanently purge cached `passwordHash`es
    and local workspaces for erased users upon sync.

## 5. `pyret-npm` Grading Sandbox & Static Asset CORS

- Interactive Design Recipe tests run **client-side inside `pyret-embed`**.
- Authoritative server-side `pyret-npm` grading executes inside an **isolated
  Cloud Run worker service** (internal authenticated worker contract +
  deterministic offline test double for `npm run check`), never in Fastify's
  event loop, with strict CPU/memory/timeout caps and no network egress.
- Self-hosted Bootstrap modules (`include url(...)` replacing `shared-gdrive`)
  are served with read-only CORS allowing only `app.*`, `<club>.*`, and
  `club.*.local`.
