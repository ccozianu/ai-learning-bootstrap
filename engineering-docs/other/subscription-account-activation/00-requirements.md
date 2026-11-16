# 00 — Requirements and decisions

Structured so that humans can skim it and LLM agents can reference items by ID. Other docs cite these IDs (e.g. "satisfies REQ-NF-1").

## Context

`learning.mycodespace.ai` is the learning platform for a network of K-12 programming clubs. Each club (starting with Galați) has its own site. Users are adult **supervisors** (parents, teachers) and **students**, many under 13. Students cannot use personal Google accounts, so their accounts are issued by the platform and controlled by a supervisor.

## Glossary

| Term | Meaning |
|------|---------|
| Club | A physical club location with its own site, e.g. `galati.learning.mycodespace.ai` |
| Applicant | Anyone requesting an account through the open site |
| Supervisor | Approved adult who signs in with Google; owns zero or more student accounts; may be a club admin |
| Student | Child account issued by the platform, owned by one supervisor, scoped to one club |
| Admin | Supervisor with the `admin` role; approves account requests |
| Edge | Google Cloud external HTTPS load balancer + Cloud Armor + IAP |

## Functional requirements

| ID | Requirement |
|----|-------------|
| REQ-F-1 | `open.learning.mycodespace.ai` serves a public presentation site and an account-request form, from a Cloud Storage bucket. |
| REQ-F-2 | Submitting an account request starts an asynchronous backend approval workflow. Submission is throttled. |
| REQ-F-3 | Each club site (e.g. `galati.learning.mycodespace.ai`) serves its HTML/JS **and** its API only to authenticated users. |
| REQ-F-4 | Supervisors authenticate with "Sign in with Google". |
| REQ-F-5 | Students authenticate with a club username and password issued by the platform (platform-owned identity provider). |
| REQ-F-6 | A supervisor can create student accounts, reset their passwords, disable/re-enable sign-in, and delete them. |
| REQ-F-7 | Students cannot self-register. Student accounts exist only if created by an approved supervisor. |
| REQ-F-8 | Admins can approve or reject account requests and suspend supervisors. |
| REQ-F-9 | An applicant can check the status of their own request. |
| REQ-F-10 | Adding a new club is a configuration change (one entry in infrastructure code), not a code change. |

## Non-functional requirements

| ID | Requirement |
|----|-------------|
| REQ-NF-1 | Unauthenticated traffic to club sites and APIs is rejected at the edge and never reaches application compute. |
| REQ-NF-2 | Costs are bounded: no request pattern from an unauthenticated or unapproved party can cause unbounded spend. |
| REQ-NF-3 | Scales to thousands of named users without architectural change. |
| REQ-NF-4 | Google Cloud only (plus DNS wherever the domain is hosted). |
| REQ-NF-5 | Infrastructure as code with Pulumi. |
| REQ-NF-6 | Data minimization for children: student accounts carry no real email address; no full real name is required as a login identifier. |
| REQ-NF-7 | Revoking a student or supervisor takes effect for API calls within 60 seconds. |
| REQ-NF-8 | Every access decision is auditable (who, what, when). |

## Decisions

| ID | Decision | Status | Why |
|----|----------|--------|-----|
| D-1 | Submitting an account request requires "Sign in with Google" (the `applicants` tenant). Viewing the open site does not. | **Proposed, confirm** | Removes the only anonymous path to compute; per-identity throttling works even behind shared NAT (schools). Applicants will be supervisors, who need Google anyway. Fallback: anonymous submit + reCAPTCHA Enterprise + Cloud Armor (see `05-security-and-cost.md`). |
| D-2 | Club static files are served by NGINX on Cloud Run with a private bucket mounted, behind IAP. No CDN for club sites. | Confirmed (forced) | IAP cannot protect backend buckets and is incompatible with Cloud CDN. |
| D-3 | IAP uses external identities via Identity Platform. Authorization uses tenants, blocking functions, and token claims instead of IAM. | Confirmed | Needed for platform-issued student accounts (REQ-F-5). |
| D-4 | Tenants: one `applicants`, one global `supervisors`, one `students-<club>` per club. | Proposed | Applicants can't reach club sites; students of one club can't authenticate to another. |
| D-5 | One set of Cloud Run services shared by all clubs; each club gets its own backend services, NEGs, and IAP settings. | Proposed | One deployable; per-club isolation at the edge. |
| D-6 | Pulumi in Python; services in Python. | Proposed | Owner familiarity; Firebase Admin SDK and Pulumi are first-class in Python. Java is an acceptable alternative for services. |

## Open questions

| ID | Question | Blocks |
|----|----------|--------|
| OQ-1 | Accept D-1 (Google sign-in before submitting a request)? | Phase 3 |
| OQ-2 | Can a supervisor belong to more than one club? (Design supports it via a `clubs` claim.) | Phase 4 |
| OQ-3 | Does Identity Platform support disabling sign-up per tenant, or only per project? If only per project, use the deny-all `beforeCreate` blocking function (designed in). | Task 2.4 |
| OQ-4 | How quickly does IAP stop admitting a disabled Identity Platform user? Measure; the app-level status check covers API calls regardless (REQ-NF-7). | Task 5.3 |
| OQ-5 | Is Cloud Armor Enterprise (DDoS bill protection) worth its cost at launch? | Phase 6 |

## Out of scope

Legal/DPA review (owner handles separately), curriculum content, the AI model-serving stack, multi-region failover, billing of club members.
