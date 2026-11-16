# 06 — Implementation plan

Sequenced tasks for Claude Code. Each fits one focused session. Do one task, verify its acceptance criteria, stop. Tasks marked **VERIFY** exist to resolve an open question before dependent work starts.

Conventions: Pulumi project in `infra/` (Python), state in `gs://<project>-pulumi-state`, secrets via `pulumi config set --secret`. Services in `services/<name>/` (Python 3.12, FastAPI unless noted), one Dockerfile each.

## Phase 0 — Bootstrap

**0.1 Project and APIs.** Enable: compute, run, iap, identitytoolkit, firestore, pubsub, cloudscheduler, secretmanager, certificatemanager, cloudbilling, billingbudgets, logging, monitoring, artifactregistry, iam. *Accept:* `gcloud services list --enabled` shows all.

**0.2 Pulumi skeleton.** `infra/` with `Pulumi.yaml`, `__main__.py`, stack `prod` (and `dev` in a separate project). GCS state backend. Config keys: `project`, `region` (`europe-west1` suggested), `apex_domain = learning.mycodespace.ai`, `clubs = ["galati"]`. *Accept:* `pulumi preview` succeeds with no resources.

**0.3 Artifact Registry + CI.** Docker repo; GitHub Actions (or Cloud Build) with Workload Identity Federation building service images. *Accept:* a hello-world image builds and pushes from CI without a JSON key.

**0.4 DNS + wildcard certificate.** Global IP; Certificate Manager DNS authorization and certificate for apex + `*.`; certificate map. If DNS isn't in Cloud DNS, Pulumi outputs the records to create manually. *Accept:* certificate state `ACTIVE`.

## Phase 1 — Open site

**1.1 Load balancer skeleton.** Target HTTPS proxy with certificate map, forwarding rules 443 + 80→443 redirect, URL map with the apex redirect and a 404 default bucket. *Accept:* `curl -I https://learning.mycodespace.ai` → 301 to `open.`; unknown host → 404.

**1.2 Open bucket + backend bucket.** `<project>-open-static`, `bb-open` with CDN, host rule for `open.*`, response headers. Deploy script per `04-static-hosting.md`. Placeholder page with a "Request an account" button. *Accept:* page loads over HTTPS; `cache-control` headers correct for `index.html` vs assets; CDN cache hits visible in logs.

**1.3 Cloud Armor edge policy.** `armor-open` on `bb-open`. *Accept:* a load test above the per-IP limit gets 429 from one IP.

## Phase 2 — Identity

**2.1 Identity Platform init.** `gcp.identityplatform.Config` (multi-tenancy on). Tenants `applicants`, `supervisors`, `students-galati` (the club tenant comes from the `ClubSite` component later; create it here manually for testing only if needed). Export tenant IDs. *Accept:* tenants listed by `gcloud identity-platform tenants list` (or the console).

**2.2 Google provider.** Manual step: create an OAuth web client in the console, store ID/secret as Pulumi secrets. `TenantDefaultSupportedIdpConfig` for Google on `applicants` and `supervisors`. Email/password enabled on student tenants. *Accept:* config visible on each tenant.

**2.3 Sign-in UI.** `services/signin-ui`: FirebaseUI + `gcip-iap` static app served by NGINX; tenant selection per resource (Google only for `applicants`; Google or username/password for club resources, with username → synthetic email mapping). Cloud Run + `bs-auth` + host rule `auth.*`. *Accept:* page loads at `https://auth.learning.mycodespace.ai`.

**2.4 VERIFY blocking functions + sign-up control (OQ-3).** `services/identity-hooks` with `beforeCreate` and `beforeSignIn` dispatching on tenant, per `02-identity.md`. Register them with Identity Platform. Prove: (a) client sign-up on `students-*` is rejected, (b) Admin SDK creation on `students-*` succeeds, (c) `supervisors` admits only emails in Firestore. Record whether per-tenant sign-up disabling exists. *Accept:* all three proven by a test script; findings written into `00-requirements.md` OQ-3.

**2.5 Firestore.** Native-mode database, collection conventions, composite indexes, TTL policies on `rate_limits` and `account_requests.expire_at`. *Accept:* `pulumi up` creates database, indexes, and TTL policies.

**2.6 Bootstrap admin script.** `scripts/bootstrap_admin.py`. *Accept:* owner's email appears in `supervisors` as ACTIVE admin of `galati`.

## Phase 3 — Account requests

**3.1 `open-api` service + `bs-open-api` with IAP (`applicants`).** Serverless NEG, backend service with IAP, `iap.Settings` with `gcip_settings` and `login_page_uri`, path rule `/api/*` on `open.*`, invoker grant to the IAP service agent. Shared JWT verification module (`libs/iapauth`) used by all services. *Accept:* anonymous `GET /api/request/status` → 302 to `auth.*`; after Google sign-in → reaches service; direct `*.run.app` → 403.

**3.2 Request endpoints.** `POST /api/request`, `GET /api/request/status`, per-identity limits, event publishing. *Accept:* submission creates `SUBMITTED` doc + Pub/Sub message; 4th submission in 30 days → 429.

**3.3 `workflow-worker`.** Push subscription; audit entries; optional notification email. *Accept:* each event produces one audit entry; redelivery is idempotent.

## Phase 4 — Club site

**4.1 `club-web` service.** NGINX image with config per `04-static-hosting.md`, gen2, private bucket mount. *Accept:* service serves the bucket's `index.html` when invoked with an identity token (pre-IAP test).

**4.2 `ClubSite` Pulumi component.** For each entry in `clubs`: `students-<club>` tenant (+ email/password), NEGs, `bs-<club>-web`, `bs-<club>-api`, `iap.Settings` for both (tenants `supervisors` + `students-<club>`), host rule, Cloud Armor attachment, `clubs/<club>` seed doc. *Accept:* `galati.*` anonymous → 302 to `auth.*` showing Supervisor and Student options; bootstrap admin can load the SPA.

**4.3 `club-api` skeleton.** `GET /api/me`, `GET /api/club`; audience→club map built from Pulumi outputs (env var); tenant and status checks per `02-identity.md`. *Accept:* `applicants` token (forged test via misrouted dev config) → 401; supervisor → 200 with claims; disabled user → 403 within 60 s.

## Phase 5 — Supervisor and student management

**5.1 Admin endpoints.** List/approve/reject requests; suspend/reactivate supervisors. *Accept:* approving a request lets that Google user sign in at `galati.*`; rejecting does not.

**5.2 Student management.** Create, reset password, enable/disable, delete; ownership checks; per-supervisor limit. *Accept:* full lifecycle passes an integration test; another supervisor gets 403 on someone else's student.

**5.3 VERIFY revocation latency (OQ-4).** Measure how long IAP admits a disabled student and supervisor with an existing session. *Accept:* numbers recorded in OQ-4; API blocked within 60 s regardless.

**5.4 Reconciler.** Hourly: Firestore status ↔ Identity Platform `disabled` flags; delete stale `applicants` users; expire old requests. *Accept:* manually introduced drift is repaired on the next run.

**5.5 Minimal SPA flows.** Supervisor dashboard (students list, create, reset, disable), student landing page, admin request queue. *Accept:* each flow usable end to end in a browser.

## Phase 6 — Hardening and cost

**6.1 `armor-backend` policy** per `05-security-and-cost.md`. *Accept:* each rule triggers under a targeted load test.

**6.2 Instance caps and kill switch.** Verify every service has `max_instances`; budget + Pub/Sub + kill-switch function. *Accept:* a simulated 100% budget message sets `open-api` and `signin-ui` to 0 instances and alerts.

**6.3 Observability.** Log sink, dashboards, alerts listed in `05-security-and-cost.md`. *Accept:* each alert fires once in a staged test.

**6.4 End-to-end tests.** One test per flow in `03-request-flows.md`, asserting where each request stops (edge vs app). Includes F-3, F-5, F-8, F-10, F-11 negative tests. *Accept:* suite passes against `dev`; CI runs it on merge.

## Phase 7 — Optional

Second club (should be config-only: proves REQ-F-10); Cloud Armor Enterprise (OQ-5); reCAPTCHA Enterprise on the sign-in page; student-facing password change; data export for parents.

## Critical path

0.1 → 0.2 → 0.4 → 1.1 → 1.2 → 2.1 → 2.2 → 2.3 → **2.4** → 2.5 → 2.6 → 3.1 → 3.2 → 4.1 → 4.2 → 4.3 → 5.1 → 5.2 → 5.3 → 6.x. Tasks 0.3, 1.3, 3.3, 5.4, 5.5 can be done in parallel once their prerequisites exist.
