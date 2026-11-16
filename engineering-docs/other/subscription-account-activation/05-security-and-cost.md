# 05 — Security and cost control

## Exposure inventory

Everything reachable without an approved identity, and what bounds its cost (REQ-NF-2):

| Surface | Reachable by | Compute per request | Bounded by |
|---------|-------------|---------------------|------------|
| `bb-open` | Anyone | None (CDN / bucket) | CDN, `armor-open` per-IP limit, small assets |
| `bs-auth` → `signin-ui` | Anyone | Static page | Cloud Armor per-IP limit, `max_instances = 3` |
| Identity Platform sign-in | Anyone with a Google account | `identity-hooks` per sign-in attempt to `supervisors` / `students-*` | Google identity endpoint limits, `identity-hooks` `max_instances`, cheap Firestore lookup |
| `bs-open-api` → `open-api` | Anyone with a Google account (D-1) | 1–2 Firestore ops | IAP (no session → no compute), Cloud Armor per-IP, per-identity limits, `max_instances = 3` |
| `bs-<club>-*` | Approved supervisors, issued students | Normal app work | Bounded population, per-identity limits, `max_instances` |

Rejected traffic is cheap, not free: load-balancer and Cloud Armor charges apply per request even when the request is denied. They are small per million requests; Cloud Armor Enterprise adds DDoS bill protection if that residual risk matters (OQ-5).

## Hard cost ceilings

1. **`max_instances` on every Cloud Run service.** This is the main ceiling: no traffic pattern can run more containers than the caps allow. Requests beyond capacity get 429/503, which is the intended failure mode.
2. **Budget kill switch.** A billing budget publishes to Pub/Sub at 50 / 90 / 100% of the monthly budget. At 100%, a small function sets `max_instances = 0` on `open-api` and `signin-ui` and alerts the owner. Club services keep running for existing users. (Preferred over disabling project billing, which shuts everything down and can lose resources.)
3. **Per-identity quotas in the app** (`rate_limits` collection with TTL): `open-api` 1 open request and 3 submissions per 30 days per applicant; `club-api` default 300 req/min per user, 10 students per supervisor.
4. **Identity Platform user counts.** Billing is per monthly active user beyond a free tier. `applicants` is the only tenant anyone can join, so the reconciler deletes stale applicant users (30 days). If abuse appears, D-1's fallback below avoids applicant accounts entirely.
5. **Firestore TTL** on `rate_limits` and expired `account_requests`.

## Cloud Armor rules (`armor-backend`)

| Priority | Match | Action |
|----------|-------|--------|
| 1000 | OWASP CRS preconfigured rules, sensitivity 1 | deny 403 |
| 2000 | Host `auth.*` | rate-based ban: 60 req/min per IP |
| 2100 | Host `open.*`, path `/api/*` | throttle: 30 req/min per IP |
| 2200 | Host `*.learning.mycodespace.ai`, path `/api/*` | throttle: 600 req/min per IP |
| 2300 | Other paths on club hosts | throttle: 1200 req/min per IP (SPA asset loads) |
| default | — | allow |

Cloud Armor evaluates before IAP, so it can't key on user identity; per-user fairness lives in the app (item 3 above). Generous per-IP limits matter because a whole club may share one public IP.

## D-1 fallback: anonymous request submission

If you reject D-1 (OQ-1), `open-api` becomes reachable anonymously. Then add:
- reCAPTCHA Enterprise on the form, with Cloud Armor rules evaluating the token score at the edge so bot submissions are denied before `open-api` runs.
- A per-IP Cloud Armor limit of ~5 req/min on `POST /api/request`.
- Email verification (a link to confirm the request) before an admin ever sees it.
- A global cap: `open-api` refuses new submissions when more than N requests are `SUBMITTED` (protects admins and Firestore).

## Origin lockdown

- All Cloud Run services: ingress `internal-and-cloud-load-balancing`; no direct domain mappings.
- Grant `roles/run.invoker` on IAP-fronted services to the IAP service agent `service-<PROJECT_NUMBER>@gcp-sa-iap.iam.gserviceaccount.com`.
- Test (Phase 6): direct `*.run.app` requests from outside return 4xx before container code runs.

## Service accounts

| Service | Account | Roles |
|---------|---------|-------|
| `club-web` | `sa-club-web` | `storage.objectViewer` on `<project>-club-static` |
| `club-api` | `sa-club-api` | `datastore.user`; `firebaseauth.admin` (Identity Platform user management); `pubsub.publisher` on the topic |
| `open-api` | `sa-open-api` | `datastore.user`; `pubsub.publisher` |
| `identity-hooks` | `sa-identity-hooks` | `datastore.viewer` |
| `workflow-worker` | `sa-workflow-worker` | `datastore.user`; `firebaseauth.admin` (reconciler, applicant cleanup) |
| CI / Pulumi | Workload Identity Federation | Deploy roles; no long-lived keys |

## Audit and alerting

- Firestore `audit` collection: every request decision, supervisor status change, student create/reset/disable/delete, with actor uid.
- Log sink to BigQuery: LB logs (IAP decisions), Cloud Armor decisions, Cloud Run logs, admin-activity audit logs.
- Alerts: 5xx rate on any service; Cloud Run hitting `max_instances`; spike in `beforeCreate` rejections; `applicants` sign-ups > threshold/day; tenant mismatch 401s in `club-api` (indicates misconfiguration); budget thresholds.

## Accepted risks

Compromise of a supervisor's Google account (mitigation: recommend 2-Step Verification to supervisors); insider with project owner rights; DNS provider outage.
