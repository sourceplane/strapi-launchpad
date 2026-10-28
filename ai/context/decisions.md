# strapi-launchpad — decisions

The choices that shape this repository, one line each, with where the full
reasoning lives. Superseded decisions stay listed, marked, so the history
reads in order.

| # | Decision | Why | Source |
|---|---|---|---|
| 1 | Only LaunchPad's `next/` front end; the Strapi server is not carried | Strapi is a long-lived Node server with a database: it needs a container, which no Orun composition provides; the brief ships the Next app against Strapi Cloud | `specs/epics/strapi-launchpad/design.md` §1 |
| 2 | OpenNext on Workers + Static Assets, the commerce baseline's shape | The site is a Next.js App Router app: route handlers, the proxy and draft mode run in the Worker | design.md §2 |
| 3 | The incremental cache in R2, the tag cache (sharded) and the revalidation queue in Durable Objects | The template caches every Strapi read with `"use cache"`; the static-assets cache cannot hold them (OpenNext refuses composable entries in it), and R2 + Durable Objects is the commerce baseline's proven shape | design.md §3 |
| 4 | `experimental.useCache`, not `cacheComponents` | A Cache Components page answers 500 then hangs under the adapter (opennextjs-cloudflare#1450). Every `"use cache"` read, profile and tag is kept; every page reads draft mode, so none prerendered upstream either | design.md §4, risk SL-C |
| 5 | Next.js 16.3.8, not upstream's ^16.3.1 lock | @opennextjs/cloudflare 1.20.11's floor | IMPLEMENTATION-STATUS |
| 6 | The sample content is the template's own seed, recorded from a Strapi that imported it (populate middlewares applied), both locales, `formats` dropped; the 40 images it names ship under `public/uploads` | An honest "before you connect" state: the site as LaunchPad's Strapi serves it, not invented content | design.md §5 |
| 7 | One connection seam (`isStrapiConnected`, the build-time URL): unconnected, every read is the sample's and nothing is fetched; a bar says how to connect | A baseline goes live with no key the platform cannot broker | design.md §5 |
| 8 | `STRAPI_URL` is an OPTIONAL build secret (`optionalSecretEnv`), inlined as the template's `NEXT_PUBLIC_API_URL`; `PREVIEW_SECRET` is a Worker secret | Browser code reads the URL; the preview secret is read at request time | design.md §5 |
| 9 | One site-name seam (`SITE_NAME`, `lib/site.ts`); the logo, sign-up and default metadata read it; the leak gate fails another | The rename rewrites one line and has no sweep for the name | risk SL-H |
| 10 | Each environment builds for its own origin: `NEXT_PUBLIC_SITE_URL` (the metadataBase) = `SITE_URL` or the workers.dev URL | The sample's Open Graph images are relative; upstream resolved them against localhost | IMPLEMENTATION-STATUS |
| 11 | Two upstream bugs fixed: `/` with no Accept-Language (a 500 in the locale matcher) and a missing page (a TypeError) | A crawler or a health check must not 500; a missing page is Next's noindex not-found page | IMPLEMENTATION-STATUS |
| 12 | Images unoptimized; `sharp` dropped | Workers has no Next.js image optimizer | IMPLEMENTATION-STATUS |
| 12a | Inter self-hosted (next/font/local, @fontsource-variable/inter, OFL) instead of next/font/google | Google Fonts answers GitHub's runners with a font URL next/font cannot read; the build needs no font network | IMPLEMENTATION-STATUS |
| 13 | Direct dependencies at upstream's locked versions; motion-dom and motion-utils held by override | framer-motion 12.23.12 imports what later motion-dom releases removed | IMPLEMENTATION-STATUS |
| 14 | The e2e connects a stand-in Strapi (`testing/lib/fake-strapi.py`) over the same seed | Strapi's REST reads, offline, deterministic, with draft reads it can tell apart | design.md §7 |
| 15 | stack-tectonic 0.19.0, `ci.yml` as the commerce baseline's, no `checks.yml`, the domain not asked, the subdomain from the Cloudflare connection | The commerce baseline's settled shape | `intent.yaml`, `blueprint.yaml` |
