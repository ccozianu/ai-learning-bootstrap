---
id: R-ACCOUNT-001
status: accepted
priority: gating
---
# Invitation-only accounts

Owner direction and console answers, 2026-10-22.

The first cut is TypeScript frontend and backend with Prisma, PostgreSQL,
REST and GraphQL. It is an independent AI Learning Git submodule under the
parent's sample projects and a DevCapsule project using VSCodium.

Signup uses Google only. Only verified Gmail identities on a manually managed
approval list may create active users. Others see an error. Approved users
may add username/password credentials to the same account. Password login
requires an emailed confirmation code on a new browser, with an optional
30-day remembered-browser cookie. User records carry available and last-used
sign-in methods. The same account cannot be silently linked to another Google
subject merely by email equality.

The owner supplies POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD and connection
location locally. The double-S spelling in the initial request was corrected
by the owner. Scripts must never send password values to agent tool output.
The owner executes reviewed schema SQL. No live database is assumed during
bootstrap. The first cut contains accounts only; auth infrastructure tables
are necessary for session expiration, code consumption and device revocation.

Acceptance: strict TypeScript/build and auth rejection tests; recorded browser
flows; owner executes SQL and validates real Google/SMTP/PostgreSQL flows.
Automated mocked tests do not establish those external acceptance conditions.
