# strapi-launchpad — operating contract (for humans and agents)

This is the standing guide to how this site is deployed and operated.
Instance facts (live URLs, workspace, whether a Strapi project is connected,
the secrets it uses) live in [deployment.md](deployment.md), rendered from
probed reality by the bootstrap's `02-docs` phase; this file is the contract
that stays true between deployments. It is written to give an agent with
repository read access enough context to reason about and operate the site
without any other source.

## What this system is

A Strapi-powered marketing site on Cloudflare, expressed as an Orun
component-native desired-state repo. Strapi itself — the content, the media,
the admin — is the owner's project (Strapi Cloud, or their own Strapi running
LaunchPad's `strapi/` app), reached over its REST API; nothing here runs
Strapi.

- **`infra/terraform/cloudflare-r2`** — one R2 bucket per deployed
  environment (`stage`, `prod`), applied by Terraform: the site's Next.js
  incremental cache. After each apply it publishes a wiring document —
  `{r2_bucket_name}` — as the Orun secret `WIRING_CLOUDFLARE_R2` on that
  environment.
- **`apps/web`** — the site: LaunchPad's Next.js front end built by
  `@opennextjs/cloudflare` into one Worker plus Static Assets. Every page
  renders per request from cached Strapi reads: each read is a `"use cache"`
  function (`lib/strapi/client.ts`) tagged by type or document with Next's
  `minutes` profile. The Worker binds the bucket (`NEXT_INC_CACHE_R2_BUCKET`)
  and exports two Durable Objects: the tag cache and the revalidation queue.
  Until a Strapi project is connected, every read is answered by the bundled
  sample (`apps/web/sample/strapi`, the template's own seed) and nothing is
  fetched.
- **`tests/web`** — the sample and the client's switch to it, the site-name
  seam, the locale proxy, `/api/health`, the preview route's refusal and the
  build's settings (vitest). No lane runs it: the `dev` lane of `tests/web`
  installs it and checks its structure, so run `pnpm typecheck`, `pnpm lint`
  and `pnpm test` before you push.
- **`tooling/*`** — shared TypeScript and ESLint configuration, and the
  wrangler renderer that turns `wrangler.template.jsonc` plus a wiring
  document into `wrangler.jsonc`.

Environments: **`stage`** and **`prod`** are deployed; **`dev` is
verify-only by design** — lanes build and dry-deploy, nothing deploys, and
no bucket exists for it (its build renders the committed fixture).

## Identity and tenancy

Every remote operation runs against ONE Orun workspace, declared in
`intent.yaml` under `execution.state.workspace` — committed, enforced, and
what CI uses. Do not remove it; headless credentials depend on it. If it
reads `ws_SET_ME`, the bootstrap had no workspace to write: set the real one
before anything else.

## How deployment works

1. Merge (or push) to `main`.
2. CI (`.github/workflows/ci.yml`) runs `orun plan --changed` — only
   components whose files changed are planned — then runs each planned lane
   with `orun run --remote-state`, authenticated by GitHub OIDC (the
   exchange resolves this repository's linked workspace server-side).
3. **The bucket before the Worker.** `cloudflare-r2` applies for the
   environment and publishes `WIRING_CLOUDFLARE_R2`. `apps/web` declares an
   enforced `dependsOn` on it for pushes to `main`, so its deploy starts only
   after that apply — and a job resolves its secrets when it starts, so the
   document is there.
4. `apps/web` renders `wrangler.jsonc` from that document (the real bucket
   name) and builds once per environment: `NEXT_PUBLIC_SITE_URL` is the
   environment's `SITE_URL` (intent.yaml) or its workers.dev URL, and the
   Strapi URL is the environment's `STRAPI_URL` secret, when set (the
   redirects are read from it then). `wrangler deploy` ships
   `strapi-launchpad-web-<env>` (the Durable Objects are created by the
   config's migration on the first deploy), and a smoke test fetches `/`
   (which must render the site's navigation) and `/api/health`, which only
   the Worker answers.
5. `prod` deploys after `stage` has converged on the same commit
   (`environments.prod.promotion` in intent.yaml).
6. **The convergence run is the deployment.** A green run means every
   planned lane applied. Failed lanes are retried with
   `gh run rerun --failed`, which resumes the same execution.

On a pull request nothing applies or deploys: the R2 root plans, the site
builds and dry-deploys, and the edges in step 3 are advisory.

Caveats that matter:

- A push that touches no component files plans zero lanes — that run is
  green and deployed nothing. Never treat "latest run green" as "site
  converged"; probe the URLs instead.
- A change to `intent.yaml`'s `environments` maps to no component and
  redeploys nothing on its own. Land it with a change under `apps/web`.
- Setting or changing `STRAPI_URL` builds nothing: it is read when the site
  builds. Redeploy it (below). So are Strapi's redirects.
- `wrangler.jsonc` is generated. Edit `wrangler.template.jsonc`, run
  `pnpm run wire:fixture` and commit both; the deploy renders its own
  config from the template, so a stale committed render misleads local work.

## The content

- **No Strapi project connected** (no `STRAPI_URL` for the environment):
  the build and the Worker fetch nothing; every page renders the bundled
  sample — the template's seed, in English and French — under a bar that
  says how to connect Strapi; the seed's redirects redirect;
  `/api/health` answers `{"ok":true,"content":"sample"}`.
- **Connected**: every page reads the project through cached reads (the
  bar is gone); `/api/health` answers `{"ok":true,"content":"strapi"}`;
  media are the project's (`<STRAPI_URL>/uploads/…`). An entry older than a
  minute is served once more while it is re-read in the background; none
  outlives an hour.
- **Draft mode**: `/api/preview?secret=<PREVIEW_SECRET>&url=<page>` turns
  it on (Strapi's preview button opens it); every read then asks Strapi for
  drafts, past the cache, until `/api/exit-preview`. With no
  `PREVIEW_SECRET` set, preview is refused (401).
- `/` redirects to the visitor's locale (`en`, `fr`) by Accept-Language; a
  page that does not exist is Next's not-found page, marked `noindex`.

## Secrets model

- **Brokered provider secrets**: `CLOUDFLARE_API_TOKEN` (the
  `workers-deploy` scope: Workers Scripts and KV Storage write) deploys the
  Worker; `CLOUDFLARE_R2_TOKEN` (the `r2-data` scope: R2 Storage write) is
  what the R2 root's Terraform authenticates with, because the deploy token
  carries no R2; `CLOUDFLARE_ACCOUNT_ID` is the connection fact both bind.
  Minted per run from the workspace's Cloudflare connection — no long-lived
  values at rest, nothing to rotate by hand.
- **Wiring**: `WIRING_CLOUDFLARE_R2` on `stage` and `prod`, written by the R2
  root's apply (lease-published), read by the Worker's build as
  `WIRING_CLOUDFLARE_R2_<ENV>`. It holds the bucket name, not a credential.
- **The project**: `STRAPI_URL` per environment, an Orun secret the owner
  sets (`orun secrets set STRAPI_URL --env <env>`), optional — read by the
  build and inlined as `NEXT_PUBLIC_API_URL`, because browser code reads it
  too. It is not a credential: the site reads published content as Strapi's
  Public role.
- **Worker secrets**: `PREVIEW_SECRET` on `strapi-launchpad-web-<env>`, set
  by the owner with `wrangler secret put`; the pipeline never reads or
  writes it.
- Inspect by NAME only: `orun secrets list --org <ws> --project` and
  `--env stage|prod`; `wrangler secret list --name strapi-launchpad-web-<env>`.
  No tooling in this repository prints a secret value, and no document in
  `ai/context/` may contain one.

## Verifying the system

```bash
# the site on each environment (also recorded, probed, in deployment.md);
# /api/health says whether it serves the sample or a Strapi project
curl -s https://strapi-launchpad-web-stage.your-workers-subdomain.workers.dev/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://strapi-launchpad-web-prod.your-workers-subdomain.workers.dev/en

# the wiring and the project the deploys read, and workspace readiness
orun secrets list --org <ws> --env stage && orun secrets list --org <ws> --env prod
orun integrations list --org <ws> --json && orun cloud check --org <ws>
```

## Common operations

| task | how |
|---|---|
| change the site | edit `apps/web` (its name: `apps/web/lib/site.ts`), merge |
| edit the content | in the Strapi project's admin; published changes show within a minute or two |
| connect a Strapi project | the README's "Connecting Strapi": `STRAPI_URL` per environment, then redeploy the site |
| preview drafts | `PREVIEW_SECRET` as a Worker secret, and the same value (with `CLIENT_URL`) in the Strapi project |
| change the sample | re-export it from a Strapi that imported the seed you want, as `apps/web/sample/strapi/<type>.<locale>.json` without `formats`, and its images into `apps/web/public/uploads` |
| deploy a change | merge to `main`; watch the run; failed lanes → `gh run rerun --failed` |
| deploy by hand | Orunbase's Deploy button, or `gh workflow run ci.yml --ref main -f environment=<env> [-f component=<a,b>]` — the named components (blank: every one) run in that environment as a merge runs them; started off `main` it is refused |
| redeploy without a change | edit the last line of `apps/web/component.yaml` (`# orun: redeploy <reason> <stamp>`) and merge — it is a deploy trigger, nothing reads it |
| empty the data cache | delete the bucket's `incremental-cache/` objects, or redeploy |
| add a binding (D1, KV, another bucket) | a Terraform root under `infra/terraform/` that publishes `WIRING_<ROOT>`, a token in `wrangler.template.jsonc`, its fixture entry, the root in the build's `--components`, the `WIRING_<ROOT>_<ENV>` secretEnv and an enforced `dependsOn` on it in `apps/web/component.yaml` |
| serve a custom domain | attach it to the Worker in Cloudflare and set `SITE_URL` for the environment in `intent.yaml` (README, "Custom domain"), then replace the placeholder `strapi-launchpad.example.com` in `intent.yaml`'s `BASE_DOMAIN` with it |
| add a runtime secret | `wrangler secret put <KEY> --name strapi-launchpad-web-<env>` for the Worker; `orun secrets set <KEY> --org <ws> --env <env>` for a lane |
| headless credentials | `ORUN_TOKEN` (workspace-scoped) + `GITHUB_TOKEN` |

The deployment record is the bootstrap's `02-docs` phase. Re-running it (the
Orun console's Retry on that phase, or `orun new … --phase 02-docs`)
re-probes the URLs and re-renders [deployment.md](deployment.md); it is
idempotent.

## Evolution

Structural changes follow the same contract that deployed the site: add a
component under `apps/`, `infra/` or `packages/` with a `component.yaml`,
land it as a pull request, and the convergence run applies it. When
@opennextjs/cloudflare runs Cache Components on workerd, turning them back on
(`cacheComponents: true` in `apps/web/next.config.ts`, in place of
`experimental.useCache`) restores upstream's configuration; the
`"use cache"` reads need no change.
