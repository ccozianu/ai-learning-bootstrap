# 02 — Identity

## Building blocks

- **Identity Platform** (GCIP) stores users per tenant and issues ID tokens.
- **IAP in external-identities mode** redirects unauthenticated users to the sign-in page, validates the resulting session, and forwards requests with a signed `x-goog-iap-jwt-assertion` header. In this mode IAM is not used for authorization; the IAP JWT carries the Identity Platform token claims (tenant, custom claims) under its `gcip` claim, and the app authorizes on those.
- **Blocking functions** (`identity-hooks`) run inside the Identity Platform sign-up and sign-in flows and can reject the attempt or add claims. They do not fire for users created through the Admin SDK, which is what lets the backend create student accounts while all client-side sign-up is denied.

## Tenants

### `applicants`
- Provider: Google. Self sign-up allowed.
- Purpose: identify whoever submits an account request (D-1).
- Grants nothing beyond `bs-open-api`.
- Housekeeping: users with no request activity for 30 days are deleted by the reconciler (keeps the user count, and Identity Platform billing, from being inflated by drive-by sign-ups).

### `supervisors`
- Provider: Google.
- `beforeCreate`: allow only if `supervisors/<email>` exists with `status == ACTIVE`; otherwise reject. An unapproved Google user therefore cannot obtain a `supervisors` session at all, so IAP turns them away at the edge.
- `beforeSignIn`: reject unless `status == ACTIVE`; set session claims `{role: "supervisor", clubs: [...], admin: bool}` from Firestore.
- Global tenant: one supervisor identity can hold several clubs (OQ-2).

### `students-<club>`
- Provider: email/password with **synthetic emails** `<username>@<club>.students.learning.mycodespace.ai` (non-deliverable). The sign-in UI asks for a username and appends the domain, so children never see or need an email (REQ-NF-6).
- `beforeCreate`: always reject. Only `club-api` creates students, via the Admin SDK (REQ-F-7). If per-tenant sign-up disabling exists (OQ-3), enable it as well, belt and braces.
- `beforeSignIn`: reject unless `students/<uid>.status == ACTIVE`.
- Custom claims set at creation: `{role: "student", club: "<club>", supervisor_uid: "<uid>"}`.

## Sign-in UI (`signin-ui`)

IAP redirects to `https://auth.learning.mycodespace.ai` with the target resource and its allowed tenants. The page shows:

- Club resources: two choices, "Supervisor: Sign in with Google" (`supervisors`) and "Student: username + password" (`students-<club>`).
- `open` API resource: "Sign in with Google" only (`applicants`).

Built with FirebaseUI's IAP integration (`firebaseui` + `gcip-iap`). It is a static page plus calls to Google's identity endpoints, so it adds almost no load of its own.

## Authorization in the app (defense in depth)

`club-api` and `open-api` verify every request with Google's library, then check:

| Check | Rule |
|-------|------|
| Signature, issuer | Valid IAP JWT, `iss = https://cloud.google.com/iap` |
| Audience → route class | `aud` must be the backend service ID of `bs-<club>-api` (for `club-api`) or `bs-open-api`; unknown audience → 401 |
| Audience → club | Club derived from audience, not Host header |
| Tenant | `gcip.firebase.tenant` must be `supervisors` or `students-<that club>`; `applicants` on a club audience → 401 + alert |
| Role / ownership | Student endpoints: caller is that student, or caller is a supervisor with `supervisor_uid == caller`, or admin |
| Status | Cached Firestore status lookup per uid (TTL ≤ 60 s); `DISABLED`/`SUSPENDED` → 403 (REQ-NF-7) |

`club-web` (NGINX) doesn't run app code; IAP is its gate. Its content is the generic SPA, identical for all clubs, so it holds no user data.

## Lifecycles

### Account request (applicant → supervisor)

| From | To | Trigger | Effect |
|------|----|---------|--------|
| — | `SUBMITTED` | `POST /api/request` (applicant signed in) | `account_requests/<id>` written; event published |
| `SUBMITTED` | `APPROVED` | Admin approves | `supervisors/<email>` written `ACTIVE` with requested club |
| `SUBMITTED` | `REJECTED` | Admin rejects | none |
| `SUBMITTED` | `EXPIRED` | 30 days, no decision | none |

After approval, the applicant visits `<club>.learning.mycodespace.ai`, chooses "Sign in with Google", and `beforeCreate` admits them into `supervisors`.

Per-identity limits: 1 open request per applicant; 3 submissions per applicant per 30 days.

### Supervisor

| From | To | Trigger | Effect |
|------|----|---------|--------|
| `ACTIVE` | `SUSPENDED` | Admin | Firestore status; Admin SDK `disabled=true` + revoke refresh tokens; all their students set `DISABLED` |
| `SUSPENDED` | `ACTIVE` | Admin | Reverse (students stay disabled until the supervisor re-enables them) |

### Student

| Operation | Endpoint (on `club-api`) | Admin SDK effect |
|-----------|--------------------------|------------------|
| Create | `POST /api/students` | `create_user` in `students-<club>`, custom claims |
| Reset password | `PUT /api/students/{uid}/password` | `update_user(password=...)` + revoke refresh tokens |
| Disable / enable | `PUT /api/students/{uid}/status` | `update_user(disabled=...)` + revoke refresh tokens |
| Delete | `DELETE /api/students/{uid}` | `delete_user`; Firestore doc removed; submissions handled per retention policy |

Limit: 10 students per supervisor by default (cost control; configurable per supervisor by admins).

## Revocation latency

Disabling a user stops new sign-ins immediately (`beforeSignIn`). An existing IAP session may stay valid for a while (OQ-4: measure). API calls are still blocked within 60 s by the status check, so a disabled user may at worst load the static SPA shell, which contains no data.

## Bootstrapping the first admin

A one-off script (`scripts/bootstrap_admin.py`) writes `supervisors/<owner email>` with `ACTIVE`, `admin: true`, and the initial club. Run once after Phase 2.
