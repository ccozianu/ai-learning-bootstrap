# General Requirements & Personas

> **Status: `Accepted (v1.3 — 2026-11-16)`** — part of
> [Project Elements Overview](../project-elements-overview.md) and
> [Edge Auth, IAP Handshake & Disconnected Club Contracts](edge-and-sync-contracts.md).

## 1. Environments, Domains & User Types

- **Domains:** Production lives under `learning.mycodespace.ai`
  (`open.learning.mycodespace.ai`, `auth.learning.mycodespace.ai`,
  `app.learning.mycodespace.ai` for home/family learners, and club subdomains
  such as `galati-ro.learning.mycodespace.ai`). Staging/test mirrors the same
  topology under `test-learning.mycodespace.ai`.
- **Adult multi-role model:** Adults may hold multiple roles (`ADMIN`, `PARENT`,
  `TEACHER`) on one verified Google account; `KID` is strictly mutually
  exclusive with adult roles.

### Parent (Family Admin)
- Signs up via any Admin-approved verified Google account (`@gmail.com` or
  Google Workspace) via the `D-1` onboarding flow; Cut 1's adult local-password
  login is retired in IAP production (dev-only fallback).
- Acts as the **admin user** for their family group (ChessKid pattern).
- Creates and manages **kid accounts** (bounded by `ownerSubscriptionId` seat
  quota), attests each kid's **`birthYear` / age** upon their own cognizance
  (mapping to age programs `≈7–11`, `11–15`, `15–18`), grants **GDPR parental
  consent** (required for under-16 digital consent), and **resets kid
  passwords directly** (`>= 12` char passphrase).
- Can link/enroll kids with a teacher's **Course** and must **explicitly
  approve** the curriculum their child follows — either directly on an immutable
  `CurriculumVersion`, or by **delegating ahead-of-time approval** to a trusted
  `TEACHER` for a named `Course` (e.g., *"Geometry, 6th grade"*) bound by an
  explicit scope promise.
- Can invoke AI/LLM curriculum & exercise generation tools within their
  subscription's LLM usage quota.

### Kid / Student (Primary Learner)
- Underage students do **not** have Google/Gmail accounts in the system.
- Each kid has a **globally unique `username`** and a verified `PARENT`/guardian
  link. Teachers may pre-create a student slot under a school/club subscription,
  but the account remains in `PENDING_PARENT_CONSENT` (blocked from logging in or
  learning) until a `PARENT` signs in, attests age, and grants GDPR consent.
- Authenticates with **`username` and `password`** (`>= 12` chars; future
  option: passwordless authentication from tablets / capable browsers) through
  the GCIP/IAP gated front door without exposing any real email:
  - Behind `auth.*`, `username` deterministically resolves to
    `<normalized-username>@students.learning.mycodespace.ai` (owned
    non-deliverable subdomain) in the single global GCIP `students` tenant
    with **GCIP Email Enumeration Protection enabled**, provisioned only once
    `accountStatus == ACTIVE` (via Admin SDK on online creation, or REST
    `projects.tenants.accounts:batchCreate` with `argon2Parameters` for offline
    club resets).
  - For kids cleared at a physical club `Location`, the backend ships their
    location-scoped `username + passwordHash` (with strict `24–72h` offline
    TTL) to the **on-site club server's local cache** (`club_cache`) for
    disconnected operation.
  - Inside the IAP gate, Fastify exchanges the IAP JWT via
    `/api/auth/iap/exchange` and enforces **2FA routed to the parent/guardian's
    verified email** on unrecognized browsers (honoring 30-day `TrustedDevice`
    tokens on personal/home browsers).
  - **Shared club device rule:** Physical club facilities (e.g., 2 teaching
    rooms with 12 Linux laptops and 15 Android tablets) use **attested**
    `ClubDevice`s (non-exportable device client TLS certs verified via GCP LB
    frontend mTLS `X-Client-Cert-*` headers — never a spoofable header). Logins
    during an active `LiveClassSession` exempt parent-email 2FA and **never**
    issue 30-day `TrustedDevice` cookies, using ephemeral per-session browser
    isolation + explicit session-clear logout. Outside an active session (e.g.,
    unsupervised open-lab hours), shared `ClubDevice`s still require
    parent-email 2FA (or a teacher-started supervised session).
- Works from **both physical club spaces and home** through approved curricula
  (`≈7–11` gradual/block coding, `11–15` Bootstrap/Pyret via embedded
  `pyret-embed` + `pyret-npm`, `15–18` containers/VS Code + Bootstrap:Data
  Science), guided by the **knowledge dependency graph**.
- **Never has direct access to commercial/TOS-restricted LLMs** (enforced as a
  coding-agent rule & security-review gate). Any future student-facing AI
  tutor (`tutor` / Design Recipe `pair-programmer` / semantic proof grader)
  requires explicit owner authorization, security review, and compliant
  self-hosted `vLLM` or Anthropic minors-path infrastructure.

### Adult Onboarding (Parents & Teachers)
- **Two-surface split:** Public landing and onboarding info live on
  `open.*` (static bucket + CDN), while the main app SPA and bulk REST/GraphQL
  APIs live behind the IAP-authenticated app surface (`app.*`, `<club>.*`).
- **Google-gated onboarding request (`D-1` pattern — sole adult admission path):**
  Prospective adults (`PARENT` or `TEACHER`, including Google Workspace emails)
  must **Sign in with Google** (`applicants` tenant behind IAP on
  `open.*/api/*`, no CAPTCHA needed) before submitting an `OnboardingRequest`
  (capturing `googleSubject` up front, eliminating email-only linking risks).
  - The `open.*` page initiates a **top-level browser navigation** to
    `/api/onboarding/session?returnTo=...` before rendering/submitting the
    `D-1` form (avoiding background `fetch` CORS/302 drops).
- Requests are rate-limited per Google subject (e.g., max 1 open request,
  bounded submissions per 30 days, auto-expiry after 30 days) with a status
  check endpoint (`SUBMITTED` / `APPROVED` / `REJECTED` / `EXPIRED`).
- Requests are reviewed, assigned confirmed roles, and **whitelisted by an
  `ADMIN`** before admission to `supervisors`.

### Teacher
- Onboards via the `ADMIN`-approved Google allowlist (`supervisors` tenant).
- Can be **cleared by an `ADMIN`** to teach specific curriculum targets
  (`curriculumId` + optional `curriculumSeriesId[]` / `lessonId[]`) at a
  specific **`Location`** (cannot self-clear if also holding `ADMIN`, and
  cannot self-delegate if also holding `PARENT`).
- Can configure an optional **local club offline passphrase** (Argon2id
  `offlinePassphraseHash`, synced to `club_cache` with short TTL) to unlock
  teacher controls (`LiveClassSession` start/end, `Attendance`, live-class
  password resets) during internet outages at that `Location`.
- Can create/manage **Courses** (a series of classes, e.g., *"Geometry, 6th
  grade"*), cohorts, enrollments, and curricula/exercises within subscription
  LLM limits, and monitor enrolled students' mastery.
- **Course scope promise & fail-closed compliance check:** When a parent
  delegates ahead-of-time approval for a `Course`, the teacher records a
  structured **`CourseScopePromise`** (subject, age band, `KnowledgeNode` tags,
  scope text); editing that promise automatically invalidates prior parent
  delegations. Every lesson or exercise added just-in-time is snapshotted to an
  immutable version/hash and gated by a **fail-closed** automated yes/no
  `ContentScopeCheck` (billed to the `Course`/owner `Subscription`, with
  direct parent `CurriculumVersion` approval as quota-exhaustion fallback).
- **Live class in session:** Has a `name`, linked `Course`/cohort, pointer to a
  `CurriculumVersion` (or scoped series/lesson IDs), intended/target calendar
  (may be recurring), `Location` + optional `TeachingRoom`, student
  **`Attendance`**, actual `startedAt` (started by `TEACHER` or `ADMIN`), and
  `endedAt`. One or many teachers (subset holding `TeacherClearance` for that
  curriculum target and location) run the session.
- Can reset/assist with a student's password **only when a live class is in
  session** and strictly for **enrolled attendees** of that active session.

### Admin (System Administrator)
- Initial `ADMIN` is seeded via an idempotent, credential-safe CLI script
  (`scripts/bootstrap-admin.ts`).
- Responsible for:
  - Reviewing `OnboardingRequest`s and whitelisting/confirming roles (triggering
    one-way GCIP `supervisors` pre-creation), plus suspending/reactivating adult
    accounts (forbidding last-`ADMIN` self-demotion/suspension; cascading
    suspension to dependent kid accounts and syncing disabled status to GCIP).
  - Provisioning and assigning `Subscription` / `SubscriptionPlan` tiers in
    Phase 1 (free/trial defaults or Admin-granted plans before billing
    integration).
  - Clearing teachers per `(curriculum target, Location)` and governing live
    class sessions.
  - System-level subscription/catalog governance and PII-free `AuditLog` review.

### GDPR Lifecycle (Consent Withdrawal, Erasure, Aging Out)
- **Consent withdrawal:** Immediately blocks kid login/access by transitioning
  `accountStatus` to `CONSENT_WITHDRAWN` (plus one-way GCIP disable sync)
  while preserving statutory records cleanly.
- **Erasure:** Hard-deletes `PyretWorkspaceState`, `Session`, `Challenge`, and
  `TrustedDevice`; clears/anonymizes PII across `User` (`username`,
  `passwordHash`, `birthYear`, `guardianUserId`, `accountStatus = ANONYMIZED`)
  and `ExerciseAttempt` payloads; deletes the corresponding GCIP `students`
  user; emits `ErasureTombstone` records to purge `club_cache`; and preserves
  strictly PII-free `AuditLog` entries. A `PARENT` cannot erase their own
  account while still `guardianUserId` of active underage `KID` accounts (must
  transfer guardianship or erase/suspend kids first).
- **Aging out:** Uses `birthYear` (+ `attestedAt`) to handle students turning
  16/18 cleanly in later phases.

## 2. Core Learning & AI Capabilities

1. **Curriculum Management, `CurriculumSeries` & Coding Runtimes:**
   - Support locally authored curricula and immutable `CurriculumVersion`
     snapshots copied from **open-source / Creative Commons** external sources
     (e.g., BootstrapWorld, preserving source URL, license, attribution, and
     rewriting `shared-gdrive(...)` to self-hosted `include url(...)`).
   - **No Moodle / no Authentik:** `ai-learning` is the **single source of
     truth**, minting signed asymmetric JWTs (+ JWKS), delegating per-location
     Ed25519 signing keys, and syncing offline caches / idempotent outboxes to
     the on-site club server.
     - Ages `7–11`: browser/tablet activities and optional local **Hedy** station.
     - Ages `11–15`: embedded **`pyret-embed`** (autosaved, client-side Design
       Recipe feedback; authoritative **`pyret-npm`** grading isolated in a
       sandboxed worker container, never in Fastify's event loop) with strict
       CORS/CSP for self-hosted Bootstrap modules.
     - Ages `15–18`: **DevCapsule / `code-server`** containers on the on-site
       server authenticated via backend/club-minted JWTs (`iss`, `aud`, `sub`,
       `locationId`, `role`, `exp`).
   - **Ordered Lesson Series & Pluggable Pedagogy (`CurriculumSeries`, e.g.,
     `"Learn Romanian Part 1"`):** Groups related lessons, `LessonPart`s, and
     exercises in explicit order, binding four pluggable strategies:
     1. *Lesson presentation template* (ordered lesson/part progression + `@media print`)
     2. *Exercise presentation template*
     3. *Exercise generation plugin* (adult-authorized LLM or procedural generator
        targeting specific `KnowledgeNode` tags)
     4. *Response evaluation & feedback plugin* — **Phase 1 uses deterministic
        evaluators only** (exact/multi-slot blanks, category bins,
        multiple-choice, sandboxed `pyret-npm`). Semantic/LLM-backed free-form
        evaluation (`FREE_FORM_PROOF`, e.g., math proofs) is **deferred to Phase 2+
        and gated behind explicit owner authorization + formal security review**.
   - **Concrete Exercise Archetypes (grounded in [AiAsTutor](../other/AiAsTutor/README.md)):**
     `FILL_IN_BLANKS` (multi-slot word blanks), `CATEGORY_SORT`,
     `MULTIPLE_CHOICE`, `PYRET_DESIGN_RECIPE` (Phase 1 deterministic), plus
     `FREE_FORM_PROOF` (Phase-2+ security-gated), seeded procedural generation
     (`ExerciseGeneratorSpec`), and `@media print` worksheets.

2. **Knowledge Tagging & Prerequisite Dependency Graph:**
   - Discrete `KnowledgeNode`s each carry a **normalized tag** and **description**
     with explicit **language designators** (defaulting to English `en`, without
     forcing non-English curricula through English).
   - Directed Acyclic Graph (`KnowledgeDependency`) tracks prerequisites (e.g.,
     *radicals* → *degree 2 equations*) and guides students to unmastered
     prerequisites first.
   - **Roadmap — Multilingual RAG / Tag Search (post-prototype):** Cross-lingual
     semantic search (`pgvector`) so e.g. a Romanian-speaking teacher easily
     finds existing tags regardless of tag language.

3. **AI-Assisted Authoring & Mandatory Adult Review Gate:**
   - Adults (quota-limited) can invoke AI to generate curriculum structures,
     lessons, exercises, knowledge tags, and dependency edges.
   - AI-generated artifacts require adult review/approval before students see
     them, and every child's study path requires explicit parent approval (direct
     or bounded `Course` delegation).

4. **Subscriptions & Metering:**
   - `SubscriptionPlan` / `Subscription` govern max kid/student seats and
     metered LLM usage limits (`LlmUsageLedger`) enforced server-side before
     dispatching LLM calls (payment gateway integration deferred).
