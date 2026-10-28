# strapi-launchpad

A Strapi-powered marketing site — a home page built from Strapi's dynamic
zones, pricing, FAQ and contact pages, a blog and a product catalogue, in
English and French, with draft mode for Strapi's preview — on **Cloudflare
Workers + Static Assets** through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), built from the
Next.js front end of [LaunchPad](https://github.com/strapi/LaunchPad) (MIT —
`apps/web/LICENSE.md`). Every read from Strapi is cached with `"use cache"` in
an **R2 bucket** that Terraform provisions per environment; the tag cache and
the revalidation queue are **Durable Objects** the Worker itself exports.

It is live from its first deploy, before any Strapi project exists: it renders
the template's own seed — the pages, posts, products and images LaunchPad's
Strapi ships with — as **sample content**, under a bar that says how to
connect Strapi. Once you give the build your project's URL, it renders yours.

## Live deployment

<!-- 02-docs:begin -->
Not recorded yet. The bootstrap's last phase writes the live URLs, the
workspace, whether a Strapi project is connected and the secrets the site uses
into [ai/context/deployment.md](ai/context/deployment.md); how the site
deploys and how to operate it is in
[ai/context/operations.md](ai/context/operations.md).
<!-- 02-docs:end -->

## What is here

| Surface | Where |
|---|---|
| The pages: `/[locale]` home, `/[locale]/[slug]` (pricing, FAQ, contact…), `/[locale]/blog`, `/[locale]/products`, sign-up; `/api/preview`, `/api/exit-preview` (draft mode), `/api/health` | `apps/web/app` |
| The site's name and its source link | `apps/web/lib/site.ts` (`SITE_NAME`, `SOURCE_URL`) |
| Strapi's reads, cached with `"use cache"` and tagged; whether a project is connected | `apps/web/lib/strapi/client.ts` |
| The sample content (the template's seed, as Strapi returns it) and its images | `apps/web/sample/strapi`, `apps/web/public/uploads`, `apps/web/lib/strapi/sample.ts` |
| The locale redirect | `apps/web/proxy.ts`, `apps/web/i18n.config.ts` |
| The dynamic-zone blocks, the navbar and footer | `apps/web/components` |
| Workers build, cache bindings and deploy contract | `apps/web/next.config.ts`, `open-next.config.ts`, `wrangler.template.jsonc` + `wiring.fixture.json` (→ `wrangler.jsonc`), `component.yaml` |
| The R2 bucket (stage, prod) | `infra/terraform/cloudflare-r2` |
| Tests | `tests/web` (vitest) |

## Getting started

```bash
pnpm install
pnpm run wire:fixture   # render apps/web/wrangler.jsonc from the offline fixture
pnpm typecheck
pnpm lint
pnpm test
pnpm build              # next build + opennextjs-cloudflare build → apps/web/.open-next
```

With no Strapi URL the build is the site on its sample content. To work
against your project, copy `apps/web/.env.example` to `apps/web/.env.local`
and set `STRAPI_URL`, then:

```bash
pnpm --filter @app/web dev        # http://localhost:3000, Next's dev server
pnpm --filter @app/web preview    # wrangler dev over the built Worker, a local R2 bucket and local Durable Objects
```

## Connecting Strapi

1. **A Strapi project with LaunchPad's content types.** The site reads the
   content model of LaunchPad's Strapi app — the `global`, `blog-page` and
   `product-page` single types, the `pages`, `articles` and `products`
   collections, the dynamic-zone components and their populate middlewares —
   which is the `strapi/` app in [strapi/LaunchPad](https://github.com/strapi/LaunchPad).
   Deploy that app to [Strapi Cloud](https://cloud.strapi.io) (create a
   project from your own copy of the repository, with `strapi` as the base
   directory), or run it yourself. To start from the content this site shows
   now, import the template's seed into it
   (`yarn strapi import -f ./data/export_20250116105447.tar.gz` in `strapi/`).
   The site reads published content as the Public role, which the seed's
   permissions already allow.
2. **Give the build your project**, once per deployed environment. The build
   inlines the URL — server and browser code both read it — so it is this
   repository's Orun secret, and stage and prod can each name their own
   project:

   ```bash
   orun secrets set STRAPI_URL --env stage   # prompts: https://<project>.strapiapp.com
   orun secrets set STRAPI_URL --env prod
   ```

   Then **redeploy the site**: a secret is read when the site builds, and
   setting one builds nothing. Use **Deploy by hand** below, or change the
   stamp on the last line of `apps/web/component.yaml` (`# orun: redeploy …`)
   and merge. From that deploy on, the pages are your project's and the
   sample bar is gone. The redirects (Strapi's `redirections` collection) are
   read when the site builds, so a new redirect shows on the next deploy.
3. **Preview drafts** (optional). Strapi's preview opens
   `/api/preview?secret=<PREVIEW_SECRET>&url=<page>&status=draft`, which turns
   on Next's draft mode: every read then asks Strapi for drafts, past the
   cache. Set the secret as a Worker secret in each environment — Cloudflare's,
   so deploys leave it alone — and the same value as `PREVIEW_SECRET` and
   `CLIENT_URL` (this site's URL) in your Strapi project:

   ```bash
   pnpm --filter @app/web exec wrangler secret put PREVIEW_SECRET --name strapi-launchpad-web-prod
   ```

   (and the same for `strapi-launchpad-web-stage`). Until it is set, preview
   is refused.

Published content is cached at the edge with Next's `minutes` profile
(`cacheLife('minutes')`: an entry older than a minute is served once more
while it is re-read in the background, and none outlives an hour), so a
published change shows within a minute or two; a redeploy shows it at once.

## How the cache is wired

The Worker binds the bucket as `NEXT_INC_CACHE_R2_BUCKET` (every `"use cache"`
entry), and two Durable Objects: `NEXT_TAG_CACHE_DO_SHARDED` (which tags were
revalidated, and when) and `NEXT_CACHE_DO_QUEUE` (background revalidation of
stale entries, through the Worker's own `WORKER_SELF_REFERENCE` binding). The
bucket's name is never hand-written: `apps/web/wrangler.template.jsonc` names
it as a wiring token, and `wrangler.jsonc` is that template rendered — from
`wiring.fixture.json` for local work and verification, and on every deploy
from the document the `cloudflare-r2` Terraform root publishes after its
apply (`WIRING_CLOUDFLARE_R2`, per environment). Edit the template, then
`pnpm run wire:fixture` and commit the render with the template. The Durable
Objects need no root: the migration in the config creates them on the first
deploy.

## How it deploys

Merges to `main` converge through [Orun](https://github.com/sourceplane/orun):
`.github/workflows/ci.yml` plans the changed components and runs each lane
against the workspace in `intent.yaml`. The R2 bucket applies first, then the
site builds for that environment — its bucket, its origin, and its Strapi
project if one is set — and deploys, to `stage`, then to `prod` once stage
has converged on the same commit; `dev` only verifies. The Worker is
`strapi-launchpad-web-<env>` on your account's workers.dev subdomain, and
every deploy is smoke-tested over HTTP: the home page must render its
navigation, and `/api/health`, which only the Worker can answer, must say ok.
A pull request runs the same pipeline's verify lanes, with nothing applied or
deployed: the R2 bucket planned for stage and prod, and the site built and
dry-deployed for each environment. They do not run the tests or the linter —
run those before you push (Getting started, above). (A push to `main`
applies, builds and deploys.)

The pipeline holds one credential, GitHub's own `GITHUB_TOKEN`. The Cloudflare
tokens and account id are brokered per run from the workspace's Cloudflare
connection — one to deploy the Worker, one with R2 access for the bucket's
apply — and the bucket names and your project's URL travel as Orun secrets;
nothing provider-shaped is stored in the repository or in GitHub. The preview
secret is a Worker secret, set once on the Workers themselves.

**Deploy by hand.** Orunbase's **Deploy** button on a component, or **Run
workflow** on the CI workflow in GitHub's Actions tab (on `main`), runs
`ci.yml` for the environment and components you pick, and each one deploys
exactly as a merge would deploy it. Leave the component blank to redeploy
every component in that environment, with nothing changed: after setting your
project's URL, say. A component with nothing to run in that environment (a
test suite in `prod`) is left out with a notice.

## How it maps to Vercel

| Vercel | Here |
|---|---|
| Next.js hosting (SSR, route handlers, the proxy, draft mode) | One Cloudflare Worker (`.open-next/worker.js`) + Static Assets (`ASSETS`) |
| Cache Components with `"use cache"`, `cacheLife` and `cacheTag` | `"use cache"`, its profile and its tags kept (`experimental.useCache`); pages render per request (below) |
| Data Cache entries | The R2 bucket bound as `NEXT_INC_CACHE_R2_BUCKET` |
| `revalidateTag` | A sharded Durable Object tag cache consulted on every cache read |
| Stale-while-revalidate | A Durable Object queue that re-renders stale entries through the Worker |
| Image Optimization (`/_next/image`, `sharp`) | Off (`images.unoptimized`): Strapi's media are served as uploaded |
| `NEXT_PUBLIC_API_URL` | The Orun secret `STRAPI_URL` (above); the sample content until set |
| `PREVIEW_SECRET` | A Worker secret |
| Deploy on push | Orun applies the bucket and deploys `strapi-launchpad-web-{stage,prod}` on merge to `main` (`apps/web/component.yaml`) |

Cache Components are off: `@opennextjs/cloudflare` 1.20 cannot run Next.js
16's Cache Components on workerd yet (a Cache Components page answers 500 and
then hangs), so the site keeps every `"use cache"` read, its profile and its
tags through `experimental.useCache`, and renders each page at request time
from those cached reads — every page reads draft mode, so none was
prerendered upstream either.

## Custom domain

The site answers on workers.dev from its first deploy. To serve it on your
own domain:

1. Add the domain to the Cloudflare account the site deploys into, and attach
   it to the Worker (dashboard → Workers & Pages →
   `strapi-launchpad-web-prod` → Settings → Domains & Routes → Add →
   Custom domain).
2. Set the environment's public origin in `intent.yaml`, so the next deploy
   resolves the site's Open Graph images against it (until then they use the
   workers.dev URL):

   ```yaml
   environments:
     prod:
       env:
         SITE_URL: https://www.example.com
   ```

   The site was born with the reserved placeholder
   `strapi-launchpad.example.com` where its domain goes: `BASE_DOMAIN` under
   each environment in `intent.yaml`. Replace it with your domain in the same
   change, and land it with a change under `apps/web` so the merge rebuilds
   the site. Point your Strapi project's `CLIENT_URL` at the new domain too.

## Credits

The site is the Next.js front end of [strapi/LaunchPad](https://github.com/strapi/LaunchPad),
designed and developed by [Aceternity](https://aceternity.com) and
[Strapi](https://strapi.io); its sample content and images are LaunchPad's
seed. MIT — `apps/web/LICENSE.md`.
