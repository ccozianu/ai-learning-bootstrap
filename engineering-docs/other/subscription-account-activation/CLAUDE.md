# CLAUDE.md

Project context for Claude Code. Design lives in `docs/`; read `docs/00-requirements.md` first, then the doc relevant to your task.

## What this is

`learning.mycodespace.ai`: the learning platform for K-12 programming clubs. A public open site for presentation and account requests, plus one authenticated site per club (`<club>.learning.mycodespace.ai`) whose static files and API are reachable only through IAP. Supervisors sign in with Google; students use platform-issued accounts owned by a supervisor.

## Load-bearing facts (do not deviate without flagging)

- **IAP in external-identities mode via Identity Platform.** No IAM-based authorization for end users. Authorization = which tenants an IAP resource accepts + blocking functions + token claims checked in the app.
- **Tenants:** `applicants` (Google, open sign-up), `supervisors` (Google, admission only for emails approved in Firestore), `students-<club>` (email/password with synthetic emails, client sign-up always denied; created only via Admin SDK).
- **IAP cannot protect backend buckets and is incompatible with Cloud CDN.** Club static files are served by `club-web` (NGINX on Cloud Run, private bucket mounted). Only the public open site uses a backend bucket + CDN.
- **All Cloud Run services:** ingress `internal-and-cloud-load-balancing`, explicit `max_instances`, dedicated service account. Never relax these, even in dev.
- **App-side checks on every request:** IAP JWT verified with Google's library; audience → (service, club); tenant allowed for that club; cached status check (≤60 s). Club is derived from the JWT audience, never from the Host header alone.
- **`club-web` and `club-api` are shared by all clubs.** A club is added by one `ClubSite` component instance in Pulumi.
- **Child data minimization:** no real email for students; synthetic `<username>@<club>.students.learning.mycodespace.ai`.

## Stack

- Infrastructure: Pulumi, Python, `pulumi_gcp`. State in GCS. Secrets via Pulumi config secrets. No `gcloud` changes to live resources as source of truth.
- Services: Python 3.12, FastAPI, `firebase-admin`, `google-auth` for IAP JWT verification. Sign-in UI: FirebaseUI + `gcip-iap` (JavaScript).
- Region: `europe-west1` unless config says otherwise.

## Layout

```
infra/                    Pulumi project
  __main__.py
  components/club_site.py ClubSite component
  edge.py identity.py data.py services.py armor.py budget.py
services/
  open-api/ club-api/ club-web/ signin-ui/ identity-hooks/ workflow-worker/
libs/iapauth/             shared JWT + tenant + status checks
spa/club/ spa/open/       frontends
scripts/                  bootstrap_admin.py, deploy_static.sh
tests/e2e/                one test per flow in docs/03-request-flows.md
docs/
```

## Working agreement

- Work from `docs/06-implementation-plan.md`: one task per session, verify its acceptance criteria, then stop and report.
- **VERIFY** tasks resolve open questions; record findings in `docs/00-requirements.md` before dependent tasks.
- If implementation contradicts a doc, the doc wins by default; if the doc is wrong, fix it in the same change and say so.
- Every endpoint gets tests for: missing JWT → 401; wrong audience → 401; wrong tenant → 401; disabled user → 403; happy path.
- Rate limits, instance caps and the budget kill switch are requirements, not polish.

## Out of scope

Legal/DPA (handled by the owner), curriculum content, AI model serving, multi-region.
