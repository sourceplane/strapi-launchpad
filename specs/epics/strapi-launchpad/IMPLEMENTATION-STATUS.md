# strapi-launchpad — implementation status

| Milestone | State | Landed |
|---|---|---|
| SL0 — the spec | ✅ | SL-1 |
| SL1 — the site on Workers | ✅ | SL-2 |
| SL2 — a baseline | ✅ | SL-3, tagged `baseline-v1` |

## Departures from the upstream template

Everything not listed here is strapi/LaunchPad `next/` as it is at `c54b5c2`.

| # | What | Why |
|---|---|---|
| 1 | The app lives in `apps/web` of a pnpm workspace (`@app/web`); every direct dependency pinned to upstream's locked version (yarn.lock); `motion-dom` 12.23.12 and `motion-utils` 12.23.6 held by override; `sharp` dropped | The workspace's shape with upstream's resolutions; framer-motion 12.23.12 imports what later motion-dom releases removed; no image optimizer on Workers |
| 2 | Next ^16.3.1 (locked 16.3.1) → 16.3.8 | @opennextjs/cloudflare 1.20.11's floor |
| 3 | `cacheComponents` off; `experimental.useCache: true` | A Cache Components page hangs on workerd (opennextjs-cloudflare#1450); every `"use cache"` read is kept |
| 4 | `next.config.ts` (was `.mjs`): `output: "standalone"`, the trace root at the workspace root, `images.unoptimized`, `NEXT_PUBLIC_API_URL` inlined from `STRAPI_URL`; the redirects read the sample's before a project is connected; `open-next.config.ts` (R2 + DO caches), `wrangler.template.jsonc`, `wiring.fixture.json`, `cloudflare-env.d.ts` added | OpenNext's build and bindings |
| 5 | `lib/strapi/sample.ts`, `sample/strapi/*.json` (the seed recorded from a Strapi that imported it, `formats` dropped), `public/uploads/` (the 40 images it names), `lib/strapi/sample-redirections.ts`; `isStrapiConnected()` in the client, each read answering from the sample first when unconnected | A product deploys before its owner has a Strapi project |
| 6 | The demo bar (`components/banner.tsx`) also shows, with how to connect Strapi, on the sample | Says what the visitor is looking at |
| 7 | `SITE_NAME` and `SOURCE_URL` in `lib/site.ts`; the logo, the sign-up heading and `lib/next-metadata.ts` read the name | One rename seam |
| 8 | `metadataBase` from `NEXT_PUBLIC_SITE_URL` in the root layout | Relative Open Graph images resolved against localhost |
| 9 | `proxy.ts`: a request with no Accept-Language goes to the default locale | Negotiator's `*` made the matcher throw: a 500 for curl, crawlers and health checks |
| 10 | `[locale]/(marketing)/[slug]`: a slug with no page calls `notFound()` — Next's not-found page, `noindex` (a 200: the template's loading boundary has already streamed the shell) | Upstream read `.seo` of undefined: a TypeError rendered as an error |
| 11 | `app/api/health/route.ts` | The deploy's smoke and the record's probe |
| 12 | ESLint: upstream's `next/core-web-vitals` in eslint-config-next 16's flat form, with `react-hooks/immutability`, `refs`, `set-state-in-effect` and `purity` off by name | Next 16 removed `next lint`; the React Compiler rules postdate the template's animation components |
| 13 | `typecheck` (`next typegen && tsc`), `preview` and `wire:fixture` scripts | The workspace's checks and the wiring |
| 13a | Inter self-hosted through `next/font/local` (`app/fonts/inter-latin-wght-normal.woff2`, the variable font's latin subset from @fontsource-variable/inter 5.2.8, OFL-1.1 — `app/fonts/Inter-OFL.txt`) instead of `next/font/google` | On GitHub's runners Google Fonts answers a font URL with no extension and next/font's loader throws; the build needs no network for fonts |
| 14 | `LICENSE.md` (MIT, as upstream declares; it ships no LICENSE file) and `README.md` replaced by the app's own | The licence travels with the code |
| 15 | Not carried: `strapi/`, `astro/`, `nuxt/`, `tanstack/`, `scripts/`, the root's yarn and prettier setup, `next/migration-log.md` | The Next front end only (design §1) |

## Verified

- The seed recorded from a local Strapi 5.58 that imported the template's
  export: 3 single types and 3 collections in `en` and `fr`.
- Under `wrangler dev`: every page 200 on the sample; `/` 307 to the
  visitor's locale; the seed's redirect 307; a missing page Next's noindex not-found page; connected to
  a Strapi, four visits to `/en` read it twice, both on the first.
- `pnpm typecheck`, `lint` (0 errors), `test` (tests/web 21) and `build`
  green with no Strapi; the Worker is 2.13 MiB gzipped (Workers Free).
- Every baseline tier passes locally on orun v2.89.0; the e2e serves the
  product as born and connected to the stand-in Strapi.
