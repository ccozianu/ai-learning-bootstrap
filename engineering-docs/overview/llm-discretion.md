# Areas Open for LLM / Agent Proposals

> **Status: `Accepted (v1.3 — 2026-11-16)`** — part of
> [Project Elements Overview](../project-elements-overview.md) and
> [Edge Auth, IAP Handshake & Disconnected Club Contracts](edge-and-sync-contracts.md).

Unless explicitly fixed in [Fixed Technology Choices & Rationale](tech-choices.md)
or constrained in [Design Constraints](design-constraints.md), the agent may
propose and recommend concrete designs in the following areas:

1. **AI / LLM Adapters Behind the Fixed Contract**
   - Concrete drivers behind `(question, context) -> answer` (adult HTTP/REST
     providers, `vLLM` self-hosted endpoints, Anthropic minors-compliant adapter,
     and on-site/adult-authenticated local bridges), enforcing `runtimeScope`
     SSRF rules (`CLOUD` vs. `ON_SITE_CLUB`) and Secret Manager ref resolution.
   - Structured output conventions (Zod-validated JSON) for curriculum
     generation, exercise generation, knowledge tagging, and dependency edge
     extraction.
   - Quota/token estimation, pre-flight reservation, and `LlmUsageLedger`
     accounting.
   - Prompt sanitization & PII scrubbing.
   - **Fail-closed `ContentScopeCheck`:** Designing the immutable-hash-bound
     yes/no classifier (and error/timeout/exhausted-quota fallback) verifying
     just-in-time teacher content against a `Course`'s structured
     `CourseScopePromise`.

2. **Knowledge Dependency Graph Representation & Routing**
   - Relational DAG modeling in PostgreSQL (adjacency list + cycle prevention /
     topological ordering / transitive closure queries in TypeScript or SQL).
   - Mastery calculation and adaptive prerequisite routing algorithm (how the
     system decides when a student has mastered *radicals* enough to unlock
     *degree 2 equations*, and how it surfaces remedial paths).
   - **Multilingual RAG / cross-lingual tag discovery (roadmap):** Post-prototype
     `pgvector` + multilingual aliases design so teachers working in any language
     (such as Romanian) can easily locate `KnowledgeNode` tags regardless of the
     tag's language designator.

3. **`CurriculumSeries` Templates, Exercise Plugins & Evaluation Engine**
   - Designing the **`CurriculumSeries`** plugin/template registry (for e.g.
     `"Learn Romanian Part 1"`):
     - **Lesson & part presentation templates** (ordered succession of lessons
       and sub-parts, plus `@media print` layouts).
     - **Exercise presentation templates** and typed schemas/deterministic
       server-side grading for `AiAsTutor` formats (`FILL_IN_BLANKS`,
       `CATEGORY_SORT`, `MULTIPLE_CHOICE`) in Phase 1.
     - **Procedural & LLM-backed exercise generation plugins:** seeded
       `ExerciseGeneratorSpec` tables emitting non-overlapping exercise batches
       targeting specific `KnowledgeNode` tags.
     - **Response evaluation & feedback plugins:** deterministic graders in Phase
       1; Phase-2+ security-gated semantic/rubric evaluation for free-form
       answers (`FREE_FORM_PROOF`, restricted strictly to `vLLM` / Anthropic
       minors path and scrubbed of PII).
   - Embedded **`pyret-embed`** workspace autosave + browser/sandboxed-container
     **`pyret-npm`** Design Recipe grading + `shared-gdrive` → self-hosted
     `include url(...)` Bootstrap module CORS/CSP config.

4. **External Open-Source / Creative Commons Ingestion**
   - Connectors/importers (e.g., for BootstrapWorld or Markdown/HTML CC
     materials) producing immutable `CurriculumVersion` snapshots with license
     and attribution preserved.

5. **API Boundary Design (REST vs. GraphQL)**
   - Defining which learning, curriculum, and mastery operations belong on
     Mercurius GraphQL (with increased `queryDepth` and proper `401`/`403`/`429`
     error mapping) vs. Fastify REST endpoints (IAP exchange, 2FA challenge,
     onboarding, file imports, async AI authoring jobs, on-site sync endpoints).

6. **Edge-to-Fastify Integration & Disconnected Club Sync**
   - Bridging IAP + GCIP (`applicants`, `supervisors`, single global `students`
     tenant) with Fastify:
     - Dual-audience IAP JWT verification, local DevCapsule dev adapter +
       deterministic unit test doubles, one-way PostgreSQL → GCIP sync outbox
       (Admin SDK `createUser` / `updateUser` plus REST
       `projects.tenants.accounts:batchCreate` with `argon2Parameters` for
       offline hash sync), and deterministic `username` →
       `<normalized>@students.learning.mycodespace.ai` mapping in `signin-ui`.
     - **On-site club cache & disconnected sync protocol:** Club-server mTLS,
       delegated Ed25519 local signing keypairs, offline teacher passphrase flow,
       `24–72h` hash cache TTL, `clientEventId` idempotent outbox replay, and
       conflict-preserving `PyretWorkspaceState` merges.

7. **Kid-Friendly UX, Physical Devices & Future Passwordless Auth**
   - Age-program-tailored UX (`7–11`, `11–15`, `15–18`) across laptops and
     tablets, plus physical `TeachingRoom` / `ClubDevice` / `Attendance` UI.
   - Future tablet/browser passwordless options (e.g., WebAuthn passkeys or
     parent-issued QR/device-login tokens) once username/password is live.
