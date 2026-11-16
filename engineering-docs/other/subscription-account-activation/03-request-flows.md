# 03 — Request flows

Each flow names the components it touches, so tests in Phase 6 can assert exactly where a request stops. "Stops at edge" means no application compute runs.

## F-1 Anonymous visitor browses the open site
`GET open.learning.mycodespace.ai/` → Cloud Armor (`armor-open`) → `bb-open` → CDN or bucket → 200.
Compute touched: none.

## F-2 Applicant submits an account request (D-1)
1. SPA on `open.*` calls `POST /api/request`.
2. URL map → `bs-open-api`. IAP finds no `applicants` session → 302 to `auth.*`.
3. Applicant signs in with Google; Identity Platform creates or finds the user in `applicants`; IAP sets its session cookie and replays the request.
4. `open-api` verifies the JWT (audience `bs-open-api`, tenant `applicants`), checks per-identity limits in `rate_limits`, writes `account_requests/<id>` as `SUBMITTED`, publishes to `account-request-events`.
5. 202 with request ID.

## F-3 Anonymous flood against `open.*/api/*`
Stops at edge: IAP redirects every request with no session. Cloud Armor's per-IP limit on `bs-open-api` throttles repeated hits (429). `open-api` is never invoked.

## F-4 Approved supervisor first visit to a club
1. `GET galati.learning.mycodespace.ai/` → `bs-galati-web`, IAP, no session → 302 to `auth.*` offering Supervisor / Student.
2. Supervisor picks Google. `supervisors` tenant → `beforeCreate` checks Firestore: approved → user created; `beforeSignIn` adds claims `{clubs:[galati], admin:false}`.
3. IAP session set; request replayed → `club-web` serves the SPA.
4. SPA calls `GET /api/me` → `bs-galati-api` → `club-api` verifies JWT, returns profile and student list.

## F-5 Unapproved Google user tries a club site
Steps 1–2 of F-4, but `beforeCreate` rejects. No session for `supervisors` → IAP keeps redirecting. Compute touched: `identity-hooks` once per attempt (sign-in flow, rate-limited by Cloud Armor on `bs-auth` and by Google's identity endpoints). `club-web` and `club-api` never invoked.

## F-6 Supervisor creates a student
`POST galati.*/api/students {username, display_name}` → `club-api`: role supervisor, club `galati` in claims, under the student limit → Admin SDK `create_user` in `students-galati` with synthetic email and initial password → Firestore `students/<uid>` → 201 with username and one-time password for the supervisor to hand over.

## F-7 Student signs in
`galati.*` → IAP → `auth.*` → "Student" → username + password → `students-galati` `beforeSignIn` checks status → session → SPA → `/api/*` with student claims.

## F-8 Student of Galați tries another club
`otherclub.*` maps only `supervisors` + `students-otherclub`. The Galați student's token is tenant-scoped to `students-galati`, so IAP requires a new sign-in, and their credentials don't exist in `students-otherclub`. Stops at edge.

## F-9 Supervisor resets a password / disables a student
`PUT /api/students/{uid}/password` or `/status` → `club-api` checks `supervisor_uid == caller` → Admin SDK update + revoke refresh tokens → Firestore → 200. Student's next sign-in uses the new password; a disabled student is blocked at `beforeSignIn`, and their API calls fail the status check within 60 s.

## F-10 Applicant-tenant token used on a club API
Not possible through IAP (`applicants` isn't mapped to club resources). If a misconfiguration ever let it through, `club-api` rejects the tenant (401) and alerts.

## F-11 Direct hit on a Cloud Run URL
`https://club-api-xxxx.a.run.app/...` → rejected by Cloud Run ingress (`internal-and-cloud-load-balancing`). Container not invoked.

## F-12 Admin approves a request
`POST galati.*/api/admin/requests/{id}/approve` → `club-api` checks `admin` claim → Firestore transaction: request `APPROVED`, `supervisors/<email>` `ACTIVE` with club → event published → `workflow-worker` writes audit entry and (optionally) emails the applicant.
