# Workstream Status: `project-management`

- **Start Date (immutable):** `2026-11-16`
- **Goal:** Coordinate project-wide priorities, sequencing, cross-workstream dependencies, portfolio checkpoints, workstream lifecycle decisions (`opening`, `pausing`, `resuming`, `blocking`, `concluding`), and routing unowned work.
- **State:** `active; permanent coordination`
- **Branch Prefix:** `ws-project-management/` (conventional first branch: `ws-project-management/coordination`)
- **Target / Integration Branch:** `main`
- **Delivery Method:** `pull-request`
- **Current Task:** Switch repository from `single-stream` to `multiple-streams` mode, publish initial reserved workstream state to `coordination`, and open the `prototype` workstream (`ws-prototype/romanian-lessons`) once prototype scope clarifications are confirmed.
- **Next Resumable Task:** Confirm open `prototype` scope questions with the owner (2 Romanian lessons, dev 2FA console vs bypass, core loop scope, human-gated schema apply) and register/start `prototype` on `ws-prototype/romanian-lessons`.

## Portfolio Context & Carried-Over Baseline (from single-stream `2026-11-16`)

- **Architecture & Requirements Accepted (`v1.3 — 2026-11-16`):** Finalized in [project-elements-overview.md](../../project-elements-overview.md) and `engineering-docs/overview/*` (`edge-and-sync-contracts.md`, `architecture-auth-flow.dot/.svg`), integrating Fable `subscription-account-activation`, physical club / disconnected on-site server support, `AiAsTutor` Romanian prototype patterns (`CurriculumSeries`), three Goldfish audits, and independent Claude Fable (`--model fable`) peer review; merged in PR #1 (`5ecede7`).
- **Implementation & Safety Rules:** Design & Planning Gate and coding-agent child-LLM restriction added in [WORKFLOW-LOCAL.md](../../../WORKFLOW-LOCAL.md).
- **Cut 1 Code & Local Validation:** React/Vite frontend, Fastify REST and Mercurius GraphQL, Prisma 7/PostgreSQL schema/scripts, Google-first signup, password sign-in, email challenges, sessions, and 30-day trusted-browser tokens are implemented on `main`. Offline Prisma 7.10.1 SQL generation guard (`npm run db:sql`), 20 mocked auth tests, and 4 desktop/mobile Playwright checks previously passed. (`node_modules` requires `npm ci` in current checkout.)
- **Environment & CLI Tools Verified (`2026-11-16`):**
  - Live PostgreSQL connectivity verified via `/usr/bin/psql` (`17.6`, `sslMode=disable`); `ai_learning` schema is not yet applied (human acceptance gate required before `db:apply`).
  - `gcloud` (`593.0.0`) installed persistently in `/opt/xtras/gcloud` (`/opt/xtras/bin/gcloud`); `gh` (`2.104.0`, authenticated as `ccozianu`) linked at `/opt/xtras/bin/gh`; Claude Fable (`2.1.302`) available via `/opt/claude/bin/claude`.
  - DevCapsule initialized through `/usr/local/bin/devcapsule0` (`0.3.0rc2`, source `e5b5a8b73309959f9407e115dcb3acd8707d6050`).
- **Owner-Requested Upcoming Stream (`prototype`):** Build a working prototype for kids learning two Romanian lessons (`AiAsTutor` patterns), with `ccozianu@gmail.com` acting as parent registering kids and logging in via a console-printed one-time token on startup, developed with `claude --model fable` pair review and delivered via PR.

## Open Threads

- **Awaiting the human:**
  - Confirm `prototype` scope choices before implementation begins: (1) which two Romanian lessons (`Verb/FirstChapter` + `Verb/SecondChapter`, or `Verb/FirstChapter` + `Numerals/FirstChapter`), (2) local dev parent-2FA 6-digit code printed to server console vs bypassed locally, (3) confirmation of prototype core scope (kid registration + `CurriculumVersion` approval + deterministic exercises + `@media print` + `KnowledgeNode`/`KnowledgeDependency`), (4) human acceptance/application of reviewed SQL migrations.
  - Note on git transport: `origin` is `git@github.com:ccozianu/ai-learning-bootstrap.git` (SSH hangs on missing host key in `~/.ssh/known_hosts`), whereas `gh` HTTPS credential helper works cleanly; clarify if `origin` / `insteadOf` should stay remote-override-only (`--remote https://...`) or be configured locally.
  - Confirm whether local uncommitted `.devcapsule/devcapsule.toml` `browser-automation` capability + `.devcapsule/devcapsule.linux-amd64.lock` change should stay checkout-local or be committed.
- **Unresolved / Pending External Setup:**
  - SMTP provider/settings, Google OAuth configuration, and real allowlist not yet supplied.
  - Schema SQL is a manual baseline (`ai_learning` schema not yet created in PostgreSQL); establish migration history before future automated migrations.
  - Parent `ws-sample-projects/ai-learning` owns submodule registration into parent `main`.

## Document Index

- `intake/` — workstream intake queue (read directory directly; items not indexed individually per `WORKFLOW.md`)
- [intake-dispositions.md](intake-dispositions.md) — append-only intake disposition log (open when reviewing or recording intake decisions)
- [index.md](../../../index.md) — repository root documentation index
