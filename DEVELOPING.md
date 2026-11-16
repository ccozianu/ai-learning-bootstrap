# Developer brief

AI Learning starts with accounts only. Keep the frontend, backend and executable
project scripts in TypeScript. PostgreSQL is supplied by the owner. Prisma is
the schema source; SQL is reviewed and executed by the owner inside DevCapsule.

`src/app.ts` owns HTTP/authentication policy and the GraphQL adapter.
`src/security.ts` owns approval and token helpers. `src/db.ts` creates Prisma
with the PostgreSQL driver adapter. `web/` is the React frontend. `scripts/`
contains local database operations. `prisma/` owns schema and generated SQL.

Read the [requirements](REQUIREMENTS.md), [project elements overview](engineering-docs/project-elements-overview.md), and [status](CURRENT-STATUS.md).
Cut 1 implemented accounts and authentication infrastructure only; Phase 1+
learning features, edge integration, and Cut 1 → Phase 1 migration steps are
specified in [engineering-docs/project-elements-overview.md](engineering-docs/project-elements-overview.md)
and gated by [WORKFLOW-LOCAL.md](WORKFLOW-LOCAL.md).

Use `npm ci`, then `npm run check`. Browser validation is `npm run test:ui`.
No automated check needs production credentials. Never inspect environment
values or secret files to diagnose setup. Scripts expose fixed, safe results.
