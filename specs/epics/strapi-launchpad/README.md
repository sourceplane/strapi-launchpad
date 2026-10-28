# strapi-launchpad — LaunchPad's Strapi-powered marketing site on Cloudflare Workers

**LaunchPad is a Next.js front end and a Strapi server. The Strapi server
needs a container, so the port carries the front end alone, reading the
owner's Strapi Cloud project over HTTP — and, until there is one, the
template's own seed as sample content. Every `"use cache"` read is kept, its
cache moved onto Cloudflare: one Worker, its data cache in R2, its tag cache
in Durable Objects.**

| | |
|---|---|
| Status | In progress — SL0 on main |
| Upstream | [strapi/LaunchPad](https://github.com/strapi/LaunchPad) `next/` (MIT, declared), at `c54b5c2` (2026-10-16); the seed is its `strapi/data` export |
| Reference | [cms-sanity](https://github.com/sourceplane/cms-sanity) for a CMS-backed site that goes live before the CMS is connected; [commerce](https://github.com/sourceplane/commerce) for the OpenNext, R2 and Durable Object cache shape |
| Key | `SL` |

## Read in this order

1. [design.md](design.md) — what is carried and what is not, how each Vercel
   piece maps to Cloudflare, the cache, the sample, the tests, and the
   alternatives rejected.
2. [implementation-plan.md](implementation-plan.md) — the milestones and
   what each one lands.
3. [risks-and-open-questions.md](risks-and-open-questions.md) — what is not
   proven, and what was accepted.
4. [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) — what shipped, and
   every departure from upstream.

## Milestones

| Milestone | What it lands | Task |
|---|---|---|
| SL0 — the spec | this doc set and the three task contracts | SL-1 |
| SL1 — the site on Workers | `apps/web`, the R2 root, `tests/web` | SL-2 |
| SL2 — a baseline | the card, the build document, the rename, the tiers | SL-3 |
