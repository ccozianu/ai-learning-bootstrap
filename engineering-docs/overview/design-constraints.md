# Design Constraints

> **Status: `Accepted (v1.3 — 2026-11-16)`** — part of
> [Project Elements Overview](../project-elements-overview.md) and
> [Edge Auth, IAP Handshake & Disconnected Club Contracts](edge-and-sync-contracts.md).

## 1. Child Protection, GDPR & LLM Provider Terms of Service
- **Coding-agent rule & security-review gate for child LLM access:** Coding
  agents/LLMs authoring this project must **not** generate code that gives
  children accounts access to LLM endpoints without explicit owner direction
  and a formal security review.
  - **Project prohibition (commercial/under-18-restricted APIs):** Commercial
    APIs whose terms exclude under-18s (such as Gemini API) or which project
    policy excludes for under-18 / student workloads (including Vertex AI,
    Model Garden, and consumer chat accounts) must **never** be exposed to child
    accounts — and **adult-relayed child prompts** ("instructor relays the
    child's question") are explicitly forbidden as circumvention, including in
    batch evaluation jobs.
  - **Permitted future student-AI path (Phase 2+, only after explicit
    authorization & security review):** Any future student-facing `tutor`
    (Socratic hints), `pair-programmer` (Design Recipe `contract + examples`
    gated), or **LLM-backed free-form response/math-proof evaluation plugin**
    (`FREE_FORM_PROOF`) may **only** target **self-hosted open-weights models
    (`vLLM` on raw GCE GPU or on-site GPU, Apache-2.0/MIT licensed)** or
    **Anthropic's API under their explicit minors safeguards** (never
    Gemini/Vertex), with age gating (`7–11`, `11–15`, `15–18`), teacher
    per-assignment switches, safety/PII filtering, AI disclosure, and full
    teacher-reviewable logs.
- **Vendor-neutral LLM resource boundary & CLI network path:** Treat an LLM as
  a configured resource with a minimal contract (`question + context -> answer`).
  Any local classroom CLI (e.g., on a teacher's laptop) connects via the
  **on-site club server or an adult-authenticated local/browser bridge** —
  never via inbound cloud-to-laptop TCP through school NAT.
- **No kid Google/Gmail requirement & GDPR `<16` consent & erasure:**
  - Underage kids authenticate with globally unique `username + password`
    (`>= 12` char passphrase; optional tablet/browser passwordless auth later),
    with `birthYear` attested by the parent admin and **GDPR parental consent**
    recorded for under-16s (Romania digital consent age = 16).
  - Teacher-pre-created kid accounts stay in `PENDING_PARENT_CONSENT` until a
    parent signs in and grants consent.
  - **GDPR consent withdrawal & erasure:** Consent withdrawal transitions
    `accountStatus` to `CONSENT_WITHDRAWN` and blocks access immediately;
    erasure hard-deletes `PyretWorkspaceState` / `Session` / `Challenge` /
    `TrustedDevice`, clears `User.username`, `passwordHash`, `birthYear`, and
    `guardianUserId` (`accountStatus = ANONYMIZED`), scrubs `ExerciseAttempt`
    payloads, deletes the GCIP `students` user, emits `ErasureTombstone` to
    purge `club_cache`, keeps `AuditLog` strictly PII-free, and blocks parent
    erasure while active underage kids depend on them.
- **Child privacy, approval & safety boundaries:**
  - **No kid-to-kid social or chat features for now** (subject to later
    reconsideration under explicit safety/moderation review).
  - **Parent and teacher visibility:** Parents have full visibility into
    their kids' activity and progress; teachers have visibility for students
    enrolled in their classes.
  - **Zero kid PII in LLM prompts:** No child PII (names, usernames, emails,
    ages, or free-text identifiers) may be sent in LLM requests; any future
    free-form evaluation must run PII scrubbing before dispatch.
  - **Parent curriculum approval & bounded teacher delegation:** Every child's
    curriculum requires explicit `PARENT` approval — direct approval on a
    `CurriculumVersion`, or ahead-of-time delegation to a `TEACHER` for a named
    `Course` (never self-delegated if adult holds both roles). Modifying a
    `CourseScopePromise` invalidates prior delegations. Just-in-time additions
    snapshot to an immutable content version/hash before passing a
    **fail-closed** `ContentScopeCheck` (static checks + strictly **`SYSTEM`-scoped**
    LLM endpoint, defending against TOCTOU edits and prompt injection, never
    inspecting student inputs, failing closed on error/timeout/quota/offline,
    with direct parent approval as fallback).
  - **Adult review gate for AI output:** AI-generated curriculum, exercises,
    knowledge tags, and dependency edges require adult review/approval before
    students see them.

## 2. Subscription, LLM Cost Bounding & Endpoint Security
- **Metered LLM usage:** All LLM invocations run against an active
  `Subscription` and are bounded by server-side quotas in `LlmUsageLedger`.
- **Seat limits & privilege separation:** Kid seats count against
  `ownerSubscriptionId`; adults cannot self-clear `TeacherClearance`, and
  last-`ADMIN` self-demotion/suspension is forbidden.
- **Endpoint SSRF & secret isolation:** `LlmEndpointConfig` URLs enforce
  `runtimeScope`-specific SSRF controls (`CLOUD` strictly public HTTPS +
  allowlist blocking RFC1918/loopback/metadata CIDRs; `ON_SITE_CLUB` allows
  admin-configured local `vLLM`/CLI endpoints), and secrets live in Secret
  Manager / env refs, never plaintext API-readable DB columns.

## 3. Content Licensing, Snapshot Stability & `pyret-npm` Sandbox
- **Open-Source / Creative Commons only for external sources:** Imported
  external content must come from verified **open-source or Creative Commons**
  sources (e.g., BootstrapWorld, rewriting `shared-gdrive` to self-hosted
  `include url(...)` with strict CORS/CSP), preserving license and attribution.
- **Immutable snapshot stability:** Approved curricula and active student paths
  pin to immutable `CurriculumVersion` snapshots.
- **`pyret-npm` execution isolation:** Authoritative server-side `pyret-npm`
  autograding never runs in the main Fastify process — it executes in an
  isolated ephemeral sandbox container with CPU/memory/time limits and no egress.

## 4. Security, Credential & Database Boundaries (Inherited from Cut 1)
- **Credential isolation:** Never read, log, or print real credentials,
  connection strings, OAuth tokens, cookies, confirmation codes, or raw mail/DB
  errors in agent output, Git, or shell arguments
  ([WORKFLOW-LOCAL.md](../../WORKFLOW-LOCAL.md)).
- **Human-gated DB schema & live mail:** Schema changes are reviewed before
  application; agents never apply schemas to live databases or send live email
  without explicit user-directed acceptance.
- **Auth invariants:** Argon2id PHC `passwordHash`, HttpOnly `SameSite=Lax`
  cookies (`__Host-` over HTTPS), `authVersion` revocation checks, exact-origin
  checks on dynamic active origins (rejecting `auth.*` on mutations),
  distributed/edge rate limiting, and no silent Google account linking by email
  equality alone.

## 5. Hosting, Auth Authority & Disconnected Club Boundaries
- **Domains & environments:** Production uses `learning.mycodespace.ai`
  (`open.*`, `auth.*`, `app.*`, and club subdomains like
  `galati-ro.learning.mycodespace.ai`); staging mirrors under
  `test-learning.mycodespace.ai`.
- **Edge-to-App Auth Split (No Split-Brain, No Unauthenticated Lookup):**
  - **Edge (`subscription-account-activation` pattern):** GCP HTTPS Load Balancer
    (frontend mTLS in `ALLOW_INVALID_OR_MISSING_CLIENT_CERT` mode injecting
    LB-overwritten `X-Client-Cert-*` headers) + Cloud Armor + **Cloud Run**
    services + IAP (External Identities) + GCIP (`applicants` with 30-day stale
    cleanup, `supervisors`, single global `students` tenant with **Email
    Enumeration Protection enabled**) + Cloud Run NGINX static `auth.*`
    (`signin-ui`). Public `open.*` static site uses a public bucket + CDN;
    `open.*/api/*` (`applicants`) and `app.*`/`<club>.*` (`supervisors`,
    `students`) sit behind IAP; `sync.*` uses the same frontend mTLS proxy
    without browser IAP.
  - **Single source of truth (Fastify + PostgreSQL):** Owns `User`,
    `OnboardingRequest` (sole adult admission path), parent-routed 2FA
    (`Challenge` + `TrustedDevice` via `/api/auth/iap/exchange`), GDPR consent,
    and `accountStatus`, syncing one-way to GCIP (creating `students` in GCIP
    only once `accountStatus == ACTIVE`). (No dual Firestore credential DB and
    no unauthenticated `username -> club` lookup endpoint.)
  - **Static hosting behind IAP:** Authenticated app SPAs (`app.*` /
    `<club>.*`) are served by Fastify (or NGINX-on-Cloud-Run behind IAP).
- **Disconnected Club Cache (`club_cache`, No Moodle / No Authentik):**
  - Fastify issues asymmetric signed JWTs (+ JWKS); each registered on-site
    server (`mTLS`) holds its own **delegated Ed25519 signing keypair** (public
    key in cloud JWKS) to mint local container JWTs offline, plus short-TTL
    (`24–72h` max) location-scoped kid `passwordHash`es, optional teacher offline
    passphrases, and `CurriculumVersion` snapshots.
  - Shared `ClubDevice` 2FA exemption requires a provisioned **device client
    TLS certificate** verified via LB frontend mTLS (`X-Client-Cert-*`) during
    an active `LiveClassSession` (`auth_time < 5 min`) plus ephemeral browser
    isolation — never a client-spoofable header and never 30-day
    `TrustedDevice` cookies. Outside an active live session, shared club
    devices require parent-email 2FA.
  - Outbox sync uses `clientEventId` UUID idempotency keys and non-destructive
    conflict copies on divergent `PyretWorkspaceState` edits.
- **No container DB provisioning & Node/TypeScript discipline:** Externally
  supplied PostgreSQL only; TypeScript on Node `>=22.12 <23` (version evolves
  with maintenance); automated checks use deterministic offline IAP/GCIP test
  doubles.
