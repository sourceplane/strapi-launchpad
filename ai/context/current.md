# strapi-launchpad — where this repository stands

The entry page for anyone (or any agent) picking this repository up. It is
this repository's own state and does not ship to a site built from it; the
two pages that do are [operations.md](operations.md) and
[deployment.md](deployment.md).

## What it is

The Next.js front end of LaunchPad (strapi/LaunchPad — Vercel's LaunchPad:
Next.js × Strapi Starter) on Cloudflare Workers + Static Assets through
`@opennextjs/cloudflare`, its Next.js cache in an R2 bucket and two Durable
Objects the Worker exports, packaged as an Orun baseline:
`orun new --blueprint repo-blueprint.yaml` builds a new site in its own
repository and takes it to live on stage and prod in one landing
(`01-product`) — the R2 bucket applied before the Worker that binds it — then
records what went live (`02-docs`). The Strapi server is not carried (it
needs a container); with no Strapi project connected the site renders the
template's own seed as sample content, and the owner connects a project by
setting its URL as an Orun secret and redeploying. It fits Workers Free (about
2.1 MiB gzipped).

## Release

| | |
|---|---|
| Latest tag | `baseline-v1` (SL2) |
| Proven live | No. Everything short of the platform is proven offline in Baseline CI — the site built and served as born on its sample content, then connected to a stand-in Strapi, its cache reused and draft mode past it. The tokens minted, a real R2 apply, a real `wrangler deploy`, the probes and a real Strapi Cloud project are still to come (risk SL-A) |

## Where to read

| Question | Page |
|---|---|
| What shipped, and every departure from upstream | `specs/epics/strapi-launchpad/IMPLEMENTATION-STATUS.md` |
| Why it is built this way | [decisions.md](decisions.md), then `specs/epics/strapi-launchpad/design.md` |
| What could still go wrong | [open-risks.md](open-risks.md), then `specs/epics/strapi-launchpad/risks-and-open-questions.md` |
| How to instantiate it | `BOOTSTRAP.md`, `docs/phases/` |
| What each component is | `apps/web/docs/`, `infra/terraform/cloudflare-r2/docs/`, `tests/web/docs/` (generated; `python3 tooling/catalog/gen-component-docs.py`) |

## Next

1. Bootstrap one site from `baseline-v1` and record its timings; connect a
   Strapi Cloud project running LaunchPad's `strapi/` app to it once and use
   its preview. That closes SL-A and SL-B.
2. When an npm release of @opennextjs/cloudflare runs Cache Components on
   workerd (opennextjs-cloudflare#1450), turn them back on (SL-C).
