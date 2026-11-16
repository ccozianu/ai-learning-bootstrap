# learning.mycodespace.ai — design

Learning platform for a network of K-12 programming clubs, on Google Cloud.

- `open.learning.mycodespace.ai`: public presentation site and account-request form (Cloud Storage + CDN).
- `<club>.learning.mycodespace.ai` (e.g. `galati`): club site and API, reachable only by authenticated users. Unauthenticated traffic is rejected at the edge by Identity-Aware Proxy.
- Supervisors (parents, teachers) sign in with Google. Students use platform-issued accounts that their supervisor creates, resets, and disables.
- Costs are bounded: hard instance caps on every service, per-identity quotas, and a budget kill switch.

![Architecture](docs/diagram.svg)

## Docs

| File | Contents |
|------|----------|
| `docs/00-requirements.md` | Requirement IDs, decisions, open questions |
| `docs/01-architecture.md` | Hostnames, resources, URL map, adding a club |
| `docs/02-identity.md` | Tenants, blocking functions, sign-in UI, lifecycles |
| `docs/03-request-flows.md` | Request traces, including where attacks stop |
| `docs/04-static-hosting.md` | Public bucket vs NGINX-on-Cloud-Run behind IAP |
| `docs/05-security-and-cost.md` | Exposure inventory, cost ceilings, Cloud Armor, service accounts |
| `docs/06-implementation-plan.md` | Phased tasks with acceptance criteria |
| `CLAUDE.md` | Context for Claude Code |

Status: design only. Supersedes the earlier `api-edge-auth-design` draft (Google-identities-only, IAM allowlist, Terraform).
