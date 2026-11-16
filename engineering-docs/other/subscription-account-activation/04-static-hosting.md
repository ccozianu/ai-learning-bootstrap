# 04 — Static hosting

Two very different static sites, because IAP cannot protect backend buckets and cannot be combined with Cloud CDN (D-2).

## Open site (`open.*`): public bucket + CDN

| Setting | Value |
|---------|-------|
| Bucket | `<project>-open-static`, uniform bucket-level access, `allUsers: roles/storage.objectViewer`, versioning on |
| Backend | `bb-open`, Cloud CDN on, `cache_mode = USE_ORIGIN_HEADERS`, negative caching, request coalescing, automatic compression |
| Edge policy | `armor-open` attached as `edge_security_policy`: per-IP rate limit (start: 600 req/min) |
| Response headers | HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, CSP allowing `self` and Google identity endpoints |

Upload rules (enforced by the deploy script):

```bash
# hashed assets: immutable
gcloud storage cp -r dist/assets gs://$BUCKET/ \
  --cache-control="public, max-age=31536000, immutable"
# entry point: always revalidate; uploaded last for atomic switchover
gcloud storage cp dist/index.html gs://$BUCKET/index.html \
  --cache-control="public, max-age=0, must-revalidate"
```

The open site is a small multi-page site or SPA; if it uses client-side routes, add a URL-map rewrite of non-asset paths to `/index.html` on the `open` host.

## Club sites (`<club>.*`): private bucket + NGINX on Cloud Run + IAP

| Setting | Value |
|---------|-------|
| Bucket | `<project>-club-static`, private, no public bindings |
| Service | `club-web`: `nginx` image, gen2 execution environment, bucket mounted read-only at `/usr/share/nginx/html` via Cloud Storage volume |
| Identity | Service account `sa-club-web` with `roles/storage.objectViewer` on that bucket only |
| Ingress | `internal-and-cloud-load-balancing` |
| Backends | `bs-<club>-web` per club, all pointing at `club-web` |
| Scale | `max_instances` 5 to start; concurrency 250 (NGINX is cheap) |

NGINX config (baked into a tiny custom image so it's versioned with the code):

- `try_files $uri /index.html;` for SPA routes.
- `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` (hashed names); `no-cache` for `index.html`.
- `gzip on` for text types.
- Security headers as on the open site.

Why no CDN is acceptable here: only authenticated users reach these files, browsers cache hashed assets for a year, and a returning user typically re-downloads just `index.html`. At thousands of users, that is a few requests per session.

The SPA is identical for every club. Club identity and branding come from `GET /api/club` at runtime, so adding a club never requires a frontend build.

Deploy: upload hashed assets, then `index.html`, to `<project>-club-static`. Cloud Storage FUSE mounts see new objects without a redeploy; NGINX `open_file_cache` should stay off (or short) so `index.html` changes appear promptly.
