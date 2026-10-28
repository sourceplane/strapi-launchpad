# strapi-launchpad — design

## 1. What is carried, and what is not

[strapi/LaunchPad](https://github.com/strapi/LaunchPad) is a yarn monorepo: a
Strapi 5 server (`strapi/`: the content types, their populate middlewares, a
seed export) and four front ends (`next/`, `astro/`, `nuxt/`, `tanstack/`).
Vercel's template is the Next.js one. The port carries `next/` alone, as
`apps/web`.

The Strapi server is not carried. Strapi is a long-lived Node process with a
database and an upload directory — a container, which no Orun composition
provides (the brief's stop list). The brief's answer, kept here: the site
reads the owner's Strapi over HTTP — a Strapi Cloud project running
LaunchPad's `strapi/` app is the documented path — and ships the template's
own content as a sample until one is connected.

## 2. The site on Workers

`@opennextjs/cloudflare` builds the app into one Worker plus Static Assets,
the commerce baseline's shape. Every route is a Next.js App Router route; the
locale redirect is Next 16's `proxy.ts` (Node runtime under OpenNext); draft
mode is Next's. `next build --webpack`: the reference starters' choice, and
the build the size was measured on (2.13 MiB gzipped — Workers Free).

## 3. The cache

Every Strapi read in `lib/strapi/client.ts` is a `"use cache"` function with
`cacheLife('minutes')` and a `cacheTag` per type or document. On Workers those
entries need a writable incremental cache — OpenNext's static-assets cache
refuses them ("Composable cache is not supported") and every visit then read
Strapi again. So the commerce baseline's shape: the R2 incremental cache
(`infra/terraform/cloudflare-r2`, wired by `WIRING_CLOUDFLARE_R2`), a sharded
Durable Object tag cache and a Durable Object revalidation queue. Measured
under `wrangler dev`: four visits to the home page made two Strapi reads, both
on the first.

## 4. Cache Components

Upstream turns on `cacheComponents`. On workerd under the adapter's newest
release a Cache Components page answers 500 and then hangs
(opennextjs-cloudflare#1450; the row-10 and row-16 spikes). So
`experimental.useCache` keeps every `"use cache"` read, its profile and its
tags, and pages render per request — which every page already did upstream:
the locale layout reads `draftMode()`.

## 5. The sample, and the switch to Strapi

The sample is the seed, recorded honestly: a local Strapi (in the factory's
scratch space, never shipped) imported `strapi/data/export_20250116105447.tar.gz`
and every single type (`global`, `blog-page`, `product-page`) and collection
(`pages`, `products`, `articles`) was read through the template's populate
middlewares in both locales — exactly the documents the template's own Strapi
answers. `formats` (the size variants no component reads) is left out; the
40 original images the documents name ship under `public/uploads`, where the
documents' `/uploads/…` URLs resolve on the Worker. The seed's two
redirections are `lib/strapi/sample-redirections.ts`.

`isStrapiConnected()` is the one seam: the build-time `NEXT_PUBLIC_API_URL`
(from the Orun secret `STRAPI_URL`) is set. Unconnected, each of the client's
three reads answers from `lib/strapi/sample.ts` before anything else — no
fetch, no draft-mode check — emulating exactly the queries the pages make: a
single type by locale, a collection by locale and optional slug, a document
by id; anything else is empty, never a throw. The template's demo bar
(`NEXT_IS_DEMO`) is reused for "Sample content · connect your Strapi project".

## 6. Identity

One seam, `SITE_NAME` in `lib/site.ts`, read by the logo, the sign-up heading
and the default metadata — the four places upstream spelled "LaunchPad" in
code. The sample content keeps the template's name (it is the seed; a
connected project replaces it), and upstream's `strapi/LaunchPad` links are
credits. `SOURCE_URL` names the product's own repository for the bar's link.
Each environment's build sets `NEXT_PUBLIC_SITE_URL`, the root layout's
`metadataBase`, so the sample's relative Open Graph images resolve against
the site, not localhost.

## 7. Tests

`tests/web`: the sample's semantics and completeness (every image it names
ships), the client's switch (nothing fetched unconnected), the locale proxy,
`/api/health`, the preview route's refusal, the seam and the build's settings.
The e2e builds the product in the lane's staged tree, serves it as born (every
page from the sample, the bar, the seed's redirects, a noindex not-found
page, health `sample`,
preview refused), then rebuilds it with `STRAPI_URL` pointing at a stand-in
Strapi (`testing/lib/fake-strapi.py`: the same seed's documents, the site's
REST reads, drafts marked) and proves the cache (a second visit reads Strapi
not at all; a change stays cached while fresh) and draft mode (entered only
with the preview secret, it reads the draft on every request).

## 8. Alternatives rejected

- **Running Strapi too** — a container; on the stop list.
- **Invented sample content** — the seed is the template's own and shows
  every block the site renders.
- **No cache (static-assets incremental cache)** — every visit would read
  Strapi (and Strapi Cloud's request quota), and OpenNext logs an error per
  read.
- **A D1 tag cache** — the commerce baseline's Durable Object one needs no
  database to provision.
- **Pointing an unconnected site at a public LaunchPad demo API** — a third
  party's server, not ours to depend on.
