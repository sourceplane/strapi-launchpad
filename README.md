# strapi-launchpad

The Next.js front end of [LaunchPad](https://github.com/strapi/LaunchPad)
(the template Vercel lists as LaunchPad: Next.js × Strapi Starter) — a
marketing site whose home page is built from Strapi's dynamic zones, with
pricing, FAQ and contact pages, a blog and a product catalogue, in English
and French, every Strapi read a `"use cache"` entry, and draft mode for
Strapi's preview — running on **Cloudflare Workers + Static Assets** through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), with the
Next.js data cache in an **R2 bucket** provisioned by Terraform through
[Orun](https://github.com/sourceplane/orun) and the tag cache and revalidation
queue in **Durable Objects** the Worker itself exports, deployed by
[Orun](https://github.com/sourceplane/orun) to stage and prod on every merge.
Packaging it as an Orun baseline is the next milestone (SL2).

The Strapi server is not part of it: running Strapi needs a long-lived Node
server (a container), which this baseline does not carry. A fresh build needs
no Strapi project: until its owner connects one — a Strapi Cloud project
running LaunchPad's `strapi/` app — the site renders the template's own seed
as sample content, under a bar that says how to connect one, never a 500. The
owner connects a project by setting its URL as an Orun secret and
redeploying. See [`specs/epics/strapi-launchpad`](specs/epics/strapi-launchpad/README.md)
for the design, the milestones and the as-built status.

## What is here (the product)

| Surface | Where |
|---|---|
| The pages: `/[locale]`, `/[locale]/[slug]`, `/[locale]/blog/…`, `/[locale]/products/…`, sign-up; `/api/preview`, `/api/exit-preview`, `/api/health` | `apps/web/app` |
| The site's name and source link | `apps/web/lib/site.ts` (`SITE_NAME`, `SOURCE_URL`) |
| Strapi's cached reads; whether a project is connected | `apps/web/lib/strapi/client.ts` |
| The sample content — the template's seed, as a Strapi that imported it returns it — and its images | `apps/web/sample/strapi`, `apps/web/public/uploads`, `apps/web/lib/strapi/sample.ts` |
| Workers build, cache bindings and deploy contract | `apps/web/next.config.ts`, `open-next.config.ts`, `wrangler.template.jsonc` + `wiring.fixture.json` (→ the committed `wrangler.jsonc`), `component.yaml` |
| The R2 bucket (stage, prod) | `infra/terraform/cloudflare-r2` |
| The wrangler renderer | `tooling/wire` |
| Tests | `tests/web` (the port's seams) |

## Getting started

```bash
pnpm install
pnpm run wire:fixture   # render apps/web/wrangler.jsonc from the offline fixture
pnpm typecheck
pnpm lint
pnpm test
pnpm build              # next build + opennextjs-cloudflare build → apps/web/.open-next
```

```bash
pnpm --filter @app/web dev        # http://localhost:3000, Next's dev server
pnpm --filter @app/web preview    # wrangler dev over the built Worker, a local R2 bucket and local Durable Objects
```

With no `STRAPI_URL` both serve the sample content. To run against a project,
put its URL in `apps/web/.env.local` (from `apps/web/.env.example`). Offline,
the e2e's stand-in Strapi answers the site's reads from the same seed:
`python3 testing/lib/fake-strapi.py --sample apps/web/sample/strapi --uploads apps/web/public/uploads --port 4010`.

## How it maps to Vercel

| Vercel | Here |
|---|---|
| Next.js hosting (SSR, route handlers, the proxy, draft mode) | One Cloudflare Worker (`.open-next/worker.js`) + Static Assets (`ASSETS`) |
| Cache Components with `"use cache"`, `cacheLife` and `cacheTag` | `"use cache"`, its profile and its tags kept through `experimental.useCache`; every page renders per request from those cached reads |
| Data Cache entries | The R2 bucket bound as `NEXT_INC_CACHE_R2_BUCKET` |
| `revalidateTag` | A sharded Durable Object tag cache (`NEXT_TAG_CACHE_DO_SHARDED`) consulted on every cache read |
| Stale-while-revalidate | A Durable Object queue (`NEXT_CACHE_DO_QUEUE`) that re-renders stale entries through the Worker's `WORKER_SELF_REFERENCE` binding |
| Image Optimization (`sharp`) | Off (`images.unoptimized`): Strapi's media are served as uploaded |
| `NEXT_PUBLIC_API_URL` | The Orun secret `STRAPI_URL` (optional build env) — and, unset, the template's own seed as sample content instead of a failed build |
| `PREVIEW_SECRET` | A Worker secret |
| The Strapi server (`strapi/`) | Not carried: Strapi Cloud (or the owner's own Strapi), connected after the build |
| Deploy on push | Orun applies the bucket and deploys `<repo>-web-{stage,prod}` on merge to `main` (`apps/web/component.yaml`) |
| "Deploy with Vercel" (clone the template) | `orun new --blueprint repo-blueprint.yaml` — a new repository, branded, deployed |

Cache Components are off: `@opennextjs/cloudflare` 1.20 cannot run Next 16's
Cache Components on workerd yet (a Cache Components page answers 500 and then
hangs — opennextjs-cloudflare#1450), so the site keeps upstream's `"use cache"`
reads through `experimental.useCache` and renders every page at request time.
The epic's [IMPLEMENTATION-STATUS](specs/epics/strapi-launchpad/IMPLEMENTATION-STATUS.md)
has the evidence.

## How the bucket reaches the Worker

```
infra/terraform/cloudflare-r2 ──apply (r2-data token)──► orun secret WIRING_CLOUDFLARE_R2 (stage, prod)
                                               │   (each deploy resolves it as it starts;
                                               │    a missing one fails the lane)
                                               ▼
apps/web  dependsOn cloudflare-r2 (enforced on main) · secretEnv WIRING_CLOUDFLARE_R2_<ENV>
  build:  tooling/wire/live.mjs → wrangler.jsonc with the environment's bucket name
          (dev, verify-only, renders the fixture) → next build → opennextjs-cloudflare
  deploy: workers-deploy token → <repo>-web-<env>, its Durable Objects migrated on first deploy
```

`wrangler.jsonc` is committed as the fixture render of
`wrangler.template.jsonc`, because the deploy lane's `verify-app-structure`
step checks the config exists before it builds; `testing/e2e.test.sh` fails
if the two disagree.

## CI

| Workflow | What it runs | Ships to a product |
|---|---|---|
| `ci.yml` | the Orun pipeline, and the only workflow a product carries: `orun plan --changed`, then one job per lane. A pull request runs the verify lanes (the R2 root planned for stage and prod, the site built and dry-deployed per environment; they neither lint nor run the tests, which `baseline.yml`'s e2e tier runs before every tag), except the bootstrap's own landings (`orun/BASE-*`), where `plan` alone runs and nothing waits for it (the landing checked its commit in the box); a merge applies the R2 bucket, then deploys stage → prod. It plans nothing while `intent.yaml` names the placeholder workspace `ws_CHANGE_ME`, as this repository does. A manual run (Orunbase's Deploy button, or Run workflow on `main`) plans the environment and components it names under the push-to-main trigger, so they deploy as a merge deploys them | yes |
