# Current Status

Workflow type: `single-stream`

## Current Stage

Architecture & requirements overview accepted (v1.3); Cut 1 local validation complete, live DB/OAuth/SMTP acceptance and Phase-1 edge PoC next.

## Current State

- Live PostgreSQL connectivity verified via `/usr/bin/psql` (`17.6`, `sslMode=disable`); `ai_learning` schema is not yet applied (awaiting human acceptance command).
- Google Cloud CLI (`593.0.0`) installed persistently under `/opt/xtras/gcloud` (linked in `/opt/xtras/bin`); `gh` CLI (`2.104.0`) linked at `/opt/xtras/bin/gh`.
- Project Elements Overview suite finalized (`Accepted v1.3 — 2026-11-16`) in `engineering-docs/project-elements-overview.md` and `engineering-docs/overview/*` (including `edge-and-sync-contracts.md` and Graphviz `.dot`/`.svg` diagram), integrating Fable `subscription-account-activation`, physical club / disconnected on-site server support, `AiAsTutor` Romanian prototype patterns (`CurriculumSeries`), three Goldfish audit passes, and an independent Claude Fable (`--model fable`) peer review.
- Implementation & child-LLM gating rules added to `WORKFLOW-LOCAL.md`.
- Owner requirements and console decisions are recorded. The owner supplied
  `git@github.com:ccozianu/ai-learning-bootstrap.git`; it had no refs on inspection.
  This is the canonical remote. SMTP service details remain pending.
- React/Vite frontend, Fastify REST and Mercurius GraphQL, Prisma 7/PostgreSQL,
  Google-first signup, optional password sign-in, email challenges, sessions
  and 30-day trusted-browser tokens are implemented.
- Database scripts generate initial schema SQL offline and apply it only on a
  human's explicit terminal command. No live database was contacted or changed.
- DevCapsule initialized through `/usr/local/bin/devcapsule0`, version
  `0.3.0rc2`, source e5b5a8b73309959f9407e115dcb3acd8707d6050.
  `project config check` passed before and after workflow bootstrap. VSCodium
  is a local choice. The project workflow was installed through `bootstrap
  project`; generated manifest/locks were never hand-edited.
- Node 22.23.1; Prisma client generation, TypeScript and production frontend
  build pass. Twenty authentication route tests pass with mocked persistence.
  SQL is generated from Prisma without credentials. Live PostgreSQL transaction
  behavior, OAuth success and mail delivery are not yet acceptance-tested.

- Four recorded browser checks pass across desktop and mobile, using installed
  Chromium build 1243 via PLAYWRIGHT_CHROMIUM_EXECUTABLE and Playwright ffmpeg
  1013. Screenshots and WebM recordings remain in ignored test-results/.
- Local static review by Claude Fable 5.1 identified recent-Google-session
  renewal, lockout recovery, username-conflict handling and key-separation
  issues; fixed with regression tests. Credential versions prevent stale login
  attempts from surviving revocation. This is not live provider acceptance.
- Offline Prisma 7.10.1 diff initially returned an empty result without a
  datasource config. An inert localhost URL and nonempty four-table output
  guard now protect the generated SQL. No live datasource was used.

## Planned Next Step

1. Enter this project through DevCapsule, have the owner apply reviewed Cut 1 SQL and configure Google/SMTP/database settings locally to complete live sign-in acceptance (or proceed directly to the Phase-1 edge/IAP/GCIP + Fastify PoC under `test-learning.mycodespace.ai`).
2. Follow the Cut 1 → Phase 1 migration checklist in [tech-choices.md](engineering-docs/overview/tech-choices.md) when starting Phase 1 implementation.
The parent sample-projects branch owns submodule registration and its integration into DevCapsule main.

## Open Threads

- SMTP provider/settings, Google OAuth configuration and
  the actual local allowlist have not been supplied. Never ask for secret values
  in chat. Provider choice may require adapting the mail transport.
- Schema SQL has not been executed. No capsule was launched for this sample;
  offline configuration validity is not launch acceptance.
- Initial SQL is a manual baseline. Establish migration history before future
  automated migrations. Expired auth-row cleanup and reverse-proxy rate-limit
  identity belong to deployment preparation.
- No actual secrets or live user data are intentionally preserved here.
- Parent branch: ws-sample-projects/ai-learning, in a clean worktree; its
  maintenance checkout is unchanged. Parent/main does not yet contain this work.

## Document Index

See [index.md](index.md) for requirements, decisions, workflow and setup.
