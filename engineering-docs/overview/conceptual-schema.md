# Conceptual Schema

> **Status: `Accepted (v1.3 — 2026-11-16)`** — part of
> [Project Elements Overview](../project-elements-overview.md) and
> [Edge Auth, IAP Handshake & Disconnected Club Contracts](edge-and-sync-contracts.md).

Logical domain entities and relationships realized in PostgreSQL (`ai_learning`
schema via Prisma). Exact column names, indexes, and table splits are refined
in Prisma migrations.

## 1. Identity, Family, Locations & Cohorts (Evolving Cut 1)

Cut 1 (`prisma/schema.prisma`) defines `User`, `Session`, `Challenge`, and
`TrustedDevice`. Phase 1 evolves them as follows:

- **`User`**
  - `email` and `googleSubject` are **nullable** (unique when present) so
    underage kids need no Gmail/Google account.
  - Adult accounts support multi-role **`roles: Role[]`** (`ADMIN`, `PARENT`,
    `TEACHER`); **`KID`** is strictly mutually exclusive with adult roles.
  - **`accountStatus`**: `PENDING_PARENT_CONSENT` | `ACTIVE` |
    `CONSENT_WITHDRAWN` | `SUSPENDED` | `ANONYMIZED` (single source of truth;
    Cut 1's `active` column is backfilled into `accountStatus` and removed).
    Extend `SignInType` enum for GCIP/IAP and club-offline sign-ins, and remove
    Cut 1's `[GOOGLE]` default on `signInTypes` / `lastSignInType` for `KID`
    creation.
  - **`gcipUid`**: nullable external GCIP UID populated only once
    `accountStatus == ACTIVE` via one-way outbox sync.
  - **`guardianUserId`** (nullable self-relation to the managing `PARENT` /
    legal guardian for `KID` accounts — unified owner for 2FA email routing,
    password resets, and GDPR consent; cleared on erasure; guardian cannot be
    erased while active underage kids depend on them).
  - **`ownerSubscriptionId`** (nullable FK to the creating family or club
    `Subscription` counting the student seat; supports explicit admin/parent
    transfer without double-counting).
  - **`birthYear`** + `attestedAt` (recorded on the parent's cognizance, mapping
    to age programs `7–11`, `11–15`, `15–18` and enabling aging-out rules;
    cleared on GDPR erasure) and **GDPR parental consent**
    (`gdprConsentGrantedAt`, `gdprConsentWithdrawnAt`, `gdprConsentVersion`).
  - **Globally unique `username`** for kids (cleared on GDPR erasure); single
    PHC-formatted Argon2id **`passwordHash`** (embedding the salt; `12..128` char
    passphrases), `authVersion`, lockout fields (plus optional
    `offlinePassphraseHash` for club-cleared `TEACHER`s). Synchronized one-way
    from PostgreSQL to the single GCIP `students` tenant
    (`<normalized-username>@students.learning.mycodespace.ai`) via Admin SDK or
    REST `batchCreate` (`argon2Parameters`), and cached on `club_cache` with a
    strict `24–72h` offline TTL.
- **`ErasureTombstone`** (Identity / Club Sync)
  - Cloud-to-`club_cache` sync tombstone recording anonymized/erased `userId`s
    so offline club caches purge stale `passwordHash`es and local workspaces on
    next sync.
- **`OnboardingRequest`** (sole adult admission path in Phase 1)
  - Captures `D-1` Google-authenticated onboarding submissions (`googleSubject`,
    verified `email` including Google Workspace, requested role `PARENT` or
    `TEACHER`, status `SUBMITTED` | `APPROVED` | `REJECTED` | `EXPIRED`,
    `expiresAt`, reviewed-by `ADMIN` user ID, confirmed `roles[]`, timestamps).
    Replaces Cut 1's static `config/approved-gmail.txt` file.
- **`AuditLog`**
  - Immutable, **PII-free** governance log (onboarding decisions, adult/kid
    suspensions, GDPR consent grants/withdrawals/erasures, teacher clearances,
    kid account create/reset/disable/delete, live class start/end) keyed by
    opaque actor/target IDs so audit integrity survives GDPR PII erasure.
- **`Session`, `Challenge`, `TrustedDevice`**
  - Enforced inside the IAP gate by Fastify + PostgreSQL (via
    `/api/auth/iap/exchange` and `/api/auth/challenge/confirm`).
  - `Challenge` handles parent-routed 2FA email codes on unrecognized browsers
    for kids (sent to `guardianUserId`'s verified email) and adults.
  - `TrustedDevice` applies to personal/home browsers only; attested shared
    `ClubDevice`s during active `LiveClassSession`s bypass 2FA and never receive
    30-day trusted-device tokens.
- **`Location`, `TeachingRoom` & `ClubDevice`**
  - Physical or virtual teaching location (`galati-ro` subdomain slug, online
    venue, etc.), physical rooms (`Room 1`, `Room 2`), registered shared equipment
    (laptops, tablets with attestation method: club proxy mTLS or provisioned
    device client cert), and registered on-site server node metadata (`mTLS`
    identity + delegated Ed25519 public signing key registered in JWKS).
- **`TeacherClearance`**
  - Admin-granted authorization (never self-granted) allowing a `TEACHER` to
    teach specific typed curriculum targets (`curriculumId` + optional
    `curriculumSeriesId[]` / `lessonId[]`) at a given `Location`.
- **`Course` & `Enrollment`**
  - Represents a series of classes/lessons (e.g., *"Geometry, 6th grade"*),
    linked to owning `TEACHER`(s), `Location`, `subscriptionId` (governing
    `ContentScopeCheck` quota billing), age-program band (`7–11`, `11–15`,
    `15–18`), and structured **`CourseScopePromise`** (`subject`, `ageBand`,
    allowed `KnowledgeNode` tags, prose boundary; mutating the promise
    invalidates prior delegated `ParentCurriculumApproval` rows).
  - **`Enrollment`** links `KID` accounts to a `Course`.
- **`ParentCurriculumApproval`**
  - Records a `PARENT`'s explicit approval for a `KID` to follow an immutable
    `CurriculumVersion`, OR an ahead-of-time **delegated approval** trusting a
    `TEACHER` for a named `Course` under its current `CourseScopePromise`
    (never self-delegated when a user holds both `PARENT` and `TEACHER`).
- **`ContentScopeCheck`**
  - Runs static checks (tags, age band, license, no unapproved external URLs)
    plus an LLM check using strictly a **`SYSTEM`-scoped `LlmEndpointConfig`**
    (never teacher-editable), bound to an immutable content hash /
    `CurriculumVersion` and `CourseScopePromise` revision. Fails closed on
    error, timeout, quota exhaustion, or offline mode, and bills
    `Course.subscriptionId` (with direct parent `CurriculumVersion` approval as
    quota-exhaustion fallback).
- **`LiveClassSession` & `Attendance`**
  - Linked to `Course`, `Location`, optional `TeachingRoom`, typed curriculum
    target (`curriculumVersionId` + optional `curriculumSeriesId[]` /
    `lessonId[]`), `targetSchedule` (may be recurring), `startedAt` (started
    by `TEACHER` or `ADMIN`), `startedByUserId`, and `endedAt`.
  - **`LiveClassTeacher`** (join table): assigns **1 or many teachers** from
    those holding `TeacherClearance` for that curriculum target and `Location`.
  - **`Attendance`**: records student presence with `clientEventId` UUID
    idempotency, scoping live-class teacher password resets strictly to enrolled
    attendees.

## 2. Subscriptions & LLM Quota Metering

- **`Subscription` / `SubscriptionPlan`**
  - Owned by a billing/admin owner (`PARENT`, `TEACHER`, or organization).
  - Defines `maxKidAccounts` / student seats and `llmQuotaLimit` / period
    (payment gateway integration deferred).
- **`LlmEndpointConfig` (Configured Resource)**
  - Scoped to `SYSTEM`, `ORGANIZATION`, `LOCATION`, or `SUBSCRIPTION` with
    explicit `runtimeScope` (`CLOUD` strictly public HTTPS + URL allowlist
    blocking RFC1918/loopback/metadata IPs vs. `ON_SITE_CLUB` allowing
    admin-configured local `vLLM`/CLI endpoints). Credentials live in Secret
    Manager / encrypted env refs, never plaintext API-readable DB columns.
- **`LlmUsageLedger`**
  - Tracks every LLM invocation attributed to a `Subscription` and initiating
    adult `User` (or `ContentScopeCheck` / Phase-2+ reviewed evaluation job) to
    enforce quotas server-side before dispatching calls.

## 3. Curriculum, Series Templates & Open-Source Attribution

- **`CurriculumSource`**
  - Internal origin or external **open-source / Creative Commons** source (e.g.,
    BootstrapWorld), storing canonical URL, license (`CC-BY-4.0`, `MIT`, etc.),
    attribution, and snapshot sync metadata.
- **`Curriculum`, `CurriculumSeries`, `Lesson`, `LessonPart` & `CurriculumVersion`**
  - `Curriculum` → `CurriculumSeries` → `Lesson` → `LessonPart` hold **stable
    logical identities** referenced by `TeacherClearance`.
  - **`CurriculumVersion`** freezes immutable versioned snapshots
    (`LessonSnapshot` / `ExerciseSnapshot` content hashes) so active approvals
    and student workspaces never drift silently when new curriculum versions are
    published.
  - Visibility scopes: `SYSTEM_CATALOG`, `LOCATION`, `TEACHER_PRIVATE`,
    `PARENT_PRIVATE`, `COURSE`.
  - **`CurriculumSeries`** (e.g., *"Learn Romanian Part 1"*) orders related
    `Lesson`s and `LessonPart`s and binds four pluggable keys:
    1. `lessonPresenterTemplate`
    2. `exercisePresenterTemplate`
    3. `exerciseGeneratorPlugin`
    4. `exerciseEvaluatorPlugin`
- **`Exercise` & `ExerciseGeneratorSpec`**
  - Linked to lessons/series and tagged with competency `KnowledgeNode`s.
  - Discriminated `exerciseType`: `FILL_IN_BLANKS`, `CATEGORY_SORT`,
    `MULTIPLE_CHOICE`, `PYRET_DESIGN_RECIPE` (Phase 1 deterministic), plus
    `FREE_FORM_PROOF` (Phase-2+ security-gated).
  - Tracks provenance (`HUMAN`, `AI_GENERATED`, `PROCEDURAL_SPEC`) and
    mandatory adult review/approval status.

## 4. Knowledge Graph & Student Mastery

- **`KnowledgeNode`**
  - Normalized tag (e.g., `theorem_of_pythagoras`) + `tagLanguage` (default
    `en`) + description + `descriptionLanguage` (default `en`).
  - *Roadmap extension:* multilingual aliases and `pgvector` embeddings for
    cross-lingual RAG discovery.
- **`KnowledgeDependency`** (Directed Acyclic Graph edge)
  - `(prerequisiteNodeId, dependentNodeId)` with `provenance` (`HUMAN_VERIFIED`
    | `AI_INFERRED_APPROVED`), `reviewStatus`, and `approvedByUserId`.
- **`StudentKnowledgeState`, `ExerciseAttempt` & `PyretWorkspaceState`**
  - `ExerciseAttempt` is append-only with `clientEventId` UUID idempotency for
    offline club sync.
  - `PyretWorkspaceState` autosaves `editorContents` per `(student, assignment)`
    with `(baseRevision, updatedAt, contentHash)` optimistic concurrency,
    preserving divergent offline edits as non-destructive conflict copies.
  - Drives prerequisite routing so students complete unmastered prerequisites
    before dependent topics.
