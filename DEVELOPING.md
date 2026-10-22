# Developer brief

AI Learning starts with accounts only. Keep the frontend, backend and executable
project scripts in TypeScript. PostgreSQL is supplied by the owner. Prisma is
the schema source; SQL is reviewed and executed by the owner inside DevCapsule.

`src/app.ts` owns HTTP/authentication policy and the GraphQL adapter.
`src/security.ts` owns approval and token helpers. `src/db.ts` creates Prisma
with the PostgreSQL driver adapter. `web/` is the React frontend. `scripts/`
contains local database operations. `prisma/` owns schema and generated SQL.

Read the [requirements](REQUIREMENTS.md) and [status](CURRENT-STATUS.md).
The only domain object in this cut is the user; sessions, challenges and devices
are authentication infrastructure. No course, lesson, role-management, billing,
admin UI, deployment, or public registration features have been requested.

Use `npm ci`, then `npm run check`. Browser validation is `npm run test:ui`.
No automated check needs production credentials. Never inspect environment
values or secret files to diagnose setup. Scripts expose fixed, safe results.
