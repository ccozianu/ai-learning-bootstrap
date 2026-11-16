# Workstream Status: `prototype`

Definition read: WORKFLOW.md@59add46a2495, WORKFLOW-LOCAL.md@b97d6e1365e1

- **Start Date (immutable):** `2026-11-16`
- **Goal:** Build a working end-to-end prototype for kids learning all three Romanian `AiAsTutor` chapters (`Verb/FirstChapter`, `Verb/SecondChapter`, `Numerals/FirstChapter`) with `ccozianu@gmail.com` acting as a parent registering kids and signing in via a startup console one-time login token (plus dev console 6-digit 2FA codes), parent `CurriculumVersion` approval, deterministic exercise grading + `@media print` worksheets, and `KnowledgeNode`/`KnowledgeDependency` mastery progression backed by live PostgreSQL, validated with `claude --model fable` pair review and delivered via PR.
- **State:** `active`
- **Branch Prefix:** `ws-prototype/` (current: `ws-prototype/romanian-lessons`)
- **Target / Integration Branch:** `main`
- **Delivery Method:** `pull-request`
- **Current Task:** Completed full prototype implementation, Claude Fable pair-review remediation, live PostgreSQL schema/seed & E2E verification, Vitest (`27/27`), and Playwright desktop/mobile UI checks (`8/8`); preparing PR to `main`.
- **Next Resumable Task:** Deliver `ws-prototype/romanian-lessons` via PR to `main`; address any owner review comments before running the `WORKFLOW.md` finishing commit (`archive/` move + `CURRENT-STATUS.md` cleanup) prior to merge.

## Validation & Review Evidence (`2026-11-16`)

- **Database Schema & Seeding (Live PostgreSQL 17.6):**
  - Generated frozen snapshot [0001_initial.prisma](../../../../prisma/snapshots/0001_initial.prisma) and offline diff migration [0002_prototype/migration.sql](../../../../prisma/migrations/0002_prototype/migration.sql); updated [scripts/db-apply.ts](../../../../scripts/db-apply.ts) to support both fresh and `0001 -> 0002` upgrade paths.
  - Applied cleanly (`--confirm-prototype-schema --reset-schema`); seeded 6 `KnowledgeNode`s, 4 `KnowledgeDependency` edges, 3 `CurriculumSeries` chapters, 9 `Lesson`s, 57 `Exercise`s, and `ccozianu@gmail.com` parent account.
- **Claude Fable (`--model fable`) Independent Pair Review & Fixes:**
  - Closed HIGH/MEDIUM/LOW findings: added `PRONOUN_CHECKPOINT_EXERCISES` (`ex-ch1-pron-1..4`) so the verb mastery DAG progresses cleanly; hard-forbade `DEV_CONSOLE_AUTH=true` in `NODE_ENV=production` and disabled default-on outside explicit `DEV_CONSOLE_AUTH=true`; made `POST /api/learn/attempts` transactional with `P2002` race-safe replay + distinct solved-exercise anti-gaming; prevented parents lifting `SUSPENDED` status; folded Romanian cedilla `ş/ţ` to `ș/ț`; hashed `CurriculumVersion` content deterministically; checked guardian allowlist dynamically for kids; bound generated exercises to `PRACTICE_SHEET` lessons; printed MCQ options; preserved `approvedAt` on revocation; and guarded React StrictMode OTT exchange.
- **Checks Executed After Final Edits:**
  - `npm run check`: `prisma generate`, `tsc --noEmit`, `vite build`, and `vitest` **27/27 passed** (`tests/auth.test.ts` + `tests/prototype.test.ts`).
  - `npm run test:ui` (Playwright Chromium 1243 desktop & mobile): **8/8 passed** (`e2e/account.spec.ts` + `e2e/prototype.spec.ts`).
  - Live PostgreSQL + Fastify E2E verification script: OTT exchange, kid registration, parent approval, guardian-routed 2FA, Ch 1–3 deterministic grading & KG state update, `/api/ready`, and GDPR erasure verified cleanly.

## Open Threads

- None blocking PR creation. Finishing commit (moving this directory to `engineering-docs/archive/2026-11-16-prototype/` and removing the row from root `CURRENT-STATUS.md`) waits until the PR is merge-ready per `WORKFLOW.md`.

## Document Index

- `intake/` — workstream intake queue (read directory directly; items not indexed individually per `WORKFLOW.md`)
- [intake-dispositions.md](intake-dispositions.md) — append-only intake disposition log
- [../../project-elements-overview.md](../../project-elements-overview.md) — Accepted `v1.3` system architecture & requirements overview
- [../../../WORKFLOW-LOCAL.md](../../../WORKFLOW-LOCAL.md) — local validation commands, credential boundary, and child-LLM gate
