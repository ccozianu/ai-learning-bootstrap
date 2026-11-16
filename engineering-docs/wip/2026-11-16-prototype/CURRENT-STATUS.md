# Workstream Status: `prototype`

- **Start Date (immutable):** `2026-11-16`
- **Goal:** Build a working end-to-end prototype for kids learning all three Romanian `AiAsTutor` chapters (`Verb/FirstChapter`, `Verb/SecondChapter`, `Numerals/FirstChapter`) with `ccozianu@gmail.com` acting as a parent registering kids and signing in via a startup console one-time login token (plus dev console 6-digit 2FA codes), parent `CurriculumVersion` approval, deterministic exercise grading + `@media print` worksheets, and `KnowledgeNode`/`KnowledgeDependency` mastery progression backed by live PostgreSQL, validated with `claude --model fable` pair review and delivered via PR.
- **State:** `active`
- **Branch Prefix:** `ws-prototype/` (current: `ws-prototype/romanian-lessons`)
- **Target / Integration Branch:** `main`
- **Delivery Method:** `pull-request`
- **Current Task:** Inspect existing Cut 1 codebase (`prisma/`, `src/`, `web/`, `scripts/`) and `Accepted v1.3` specs + `AiAsTutor` chapter content to design the `prototype` database schema, backend APIs, UI, and PostgreSQL setup.
- **Next Resumable Task:** Create new database/schema cleanly per owner authorization, design & implement `prototype` backend/frontend/seed for all 3 Romanian chapters, run checks + `claude --model fable` pair review, and prepare PR to `main`.

## Owner Decisions Confirmed (`2026-11-16`)

1. **Lessons scope:** Include **all three** Romanian `AiAsTutor` chapters (`Verb/FirstChapter`, `Verb/SecondChapter`, `Numerals/FirstChapter`).
2. **Local dev auth / 2FA:** Print a one-time login token for `ccozianu@gmail.com` to the server console on startup AND print 6-digit parent-2FA codes to the server console when SMTP is not configured.
3. **Core prototype workflow:** Parent onboarding via console one-time token (`ccozianu@gmail.com`), kid account registration/management, parent review/approval of `CurriculumVersion` chapters, child-isolated learning portal (`CurriculumSeries` lessons, interactive deterministic exercises + `@media print` worksheets), and `KnowledgeNode`/`KnowledgeDependency` mastery progression.
4. **Database setup:** Owner authorized creating a dedicated PostgreSQL database/schema and dropping/replacing the existing empty one using the supplied environment credentials (respecting Credential Boundary: never print credentials or connection strings).

## Open Threads

- None (all initial scope questions settled; follow Design & Planning Gate and coding-agent child-LLM rules in `WORKFLOW-LOCAL.md`).

## Document Index

- `intake/` — workstream intake queue (read directory directly; items not indexed individually per `WORKFLOW.md`)
- [intake-dispositions.md](intake-dispositions.md) — append-only intake disposition log
- [../../project-elements-overview.md](../../project-elements-overview.md) — Accepted `v1.3` system architecture & requirements overview
- [../../../WORKFLOW-LOCAL.md](../../../WORKFLOW-LOCAL.md) — local validation commands, credential boundary, and child-LLM gate
