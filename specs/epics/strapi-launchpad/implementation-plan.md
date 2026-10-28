# strapi-launchpad — implementation plan

| Milestone | Lands | Done when |
|---|---|---|
| SL0 — the spec | the repository born (intent, CI, tooling, spec index), this doc set, SL-1…SL-3 | on main |
| SL1 — the site on Workers | `apps/web` (upstream `next/` at `c54b5c2` plus the departures in IMPLEMENTATION-STATUS, the seed recorded as `sample/strapi` and its images), `infra/terraform/cloudflare-r2`, `tests/web` | typecheck, lint, test, build green with no Strapi; served on the sample and connected under `wrangler dev` |
| SL2 — a baseline | `blueprint.yaml`, `repo-blueprint.yaml`, `.baseline/`, the rename engine and bootstrap helpers, the record renderer, the context pack, `testing/` with the stand-in Strapi, `baseline.yml`, `tag.yml` | Baseline CI green; `baseline-v1` tagged |

Order inside SL1: the seed recorded (a local Strapi importing the template's
export, every single type and collection read through its populate
middlewares, both locales); the sample switch; the build on OpenNext (Cache
Components off, `useCache`, the R2 + DO caches, a cached read reused under
`wrangler dev`); the two upstream bugs a curl and a missing page found; the
tests.
