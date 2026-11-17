# Workstream Status: `prototype`

Definition read: WORKFLOW.md@59add46a2495, WORKFLOW-LOCAL.md@b97d6e1365e1

- **Start Date (immutable):** `2026-11-16`
- **Goal:** Build a working end-to-end prototype for kids learning all three Romanian `AiAsTutor` chapters (`Verb/FirstChapter`, `Verb/SecondChapter`, `Numerals/FirstChapter`) with `ccozianu@gmail.com` acting as a parent registering kids and signing in via a startup console one-time login token (plus dev console 6-digit 2FA codes), parent `CurriculumVersion` approval, isolated parent kid-impersonation preview in a new tab, deterministic exercise grading + `@media print` worksheets, and `KnowledgeNode`/`KnowledgeDependency` mastery progression backed by live PostgreSQL, validated with `claude --model fable` pair review and delivered via PR.
- **State:** `active`
- **Branch Prefix:** `ws-prototype/` (current: `ws-prototype/romanian-lessons`)
- **Target / Integration Branch:** `main`
- **Delivery Method:** `pull-request`
- **Current Task:** Completed Romanian 3-chapter prototype plus isolated parent kid-impersonation preview in a new tab, `claude --model fable` pair reviews, live PostgreSQL schema/seed & E2E verification, Vitest (`28/28`), and Playwright desktop/mobile UI checks (`10/10`); updated PR #2 on `main`.
- **Next Resumable Task:** Review PR #2; address any owner feedback before running the `WORKFLOW.md` finishing commit (`archive/` move + root `CURRENT-STATUS.md` cleanup) prior to merge.

## Validation & Review Evidence (`2026-11-16` – `2026-11-17`)

- **Database Schema & Seeding (Live PostgreSQL 17.6):**
  - Generated frozen snapshot [0001_initial.prisma](../../../../prisma/snapshots/0001_initial.prisma) and offline diff migration [0002_prototype/migration.sql](../../../../prisma/migrations/0002_prototype/migration.sql) (including `ImpersonationSession`, `ParentPreviewAttempt`, and `ParentPreviewKnowledgeState`); updated [scripts/db-apply.ts](../../../../scripts/db-apply.ts) to support both fresh and `0001 -> 0002` upgrade paths.
  - Applied cleanly (`--confirm-prototype-schema --reset-schema`); seeded 6 `KnowledgeNode`s, 4 `KnowledgeDependency` edges, 3 `CurriculumSeries` chapters, 9 `Lesson`s, 57 `Exercise`s, and `ccozianu@gmail.com` parent account.
- **Claude Fable (`--model fable`) Independent Pair Reviews & Fixes:**
  - Initial prototype pass: closed all HIGH/MEDIUM/LOW findings (root pronoun checkpoint exercises, prod `DEV_CONSOLE_AUTH` block, transactional `P2002`-safe & anti-gaming attempts, consent state locks, cedilla folding, deterministic curriculum hashing, guardian allowlist propagation).
  - Parent impersonation pass: closed all MEDIUM/LOW findings (`sessionStorage` stale-token retry & clear-on-login, `403` guard on auth mutations when `X-Impersonation-Token` is sent + GraphQL `resolveEffectiveIdentity`, URL fragment `#impersonate=` with 120s launch TTL & stale-row cleanup, failed-exchange/exit notice preservation, popup-blocker inline link fallback, and invalidation test coverage).
- **Checks Executed After Final Edits:**
  - `npm run check`: `prisma generate`, `tsc --noEmit`, `vite build`, and Vitest **28/28 passed** (`tests/auth.test.ts` + `tests/prototype.test.ts`).
  - Playwright Chromium 1243 desktop & mobile UI suite: **10/10 passed** (`e2e/account.spec.ts` + `e2e/prototype.spec.ts`, including two-tab parent impersonation).
  - Live PostgreSQL 17.6 + Fastify E2E verification script: OTT exchange, kid registration, parent approval, guardian-routed 2FA, Ch 1–3 deterministic grading & KG state update, isolated parent impersonation preview persistence (`exerciseAttempt` untouched), `/api/ready`, and GDPR erasure verified cleanly.

## Open Threads

- None blocking PR #2 review. Finishing commit (moving this directory to `engineering-docs/archive/2026-11-16-prototype/` and removing the row from root `CURRENT-STATUS.md`) waits until PR #2 is merge-ready per `WORKFLOW.md`.

## Document Index

- `intake/` — workstream intake queue (read directory directly; items not indexed individually per `WORKFLOW.md`)
- [intake-dispositions.md](intake-dispositions.md) — append-only intake disposition log
- [../../project-elements-overview.md](../../project-elements-overview.md) — Accepted `v1.3` system architecture & requirements overview
- [../../../WORKFLOW-LOCAL.md](../../../WORKFLOW-LOCAL.md) — local validation commands, credential boundary, and child-LLM gate
