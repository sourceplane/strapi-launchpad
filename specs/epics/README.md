# Epics

Orun-style work programs. Each epic is a folder carrying `epic.yaml` (the
declaration the platform reads: slug, key prefix, milestones with exit
criteria and task keys) beside its doc set. The pull request that adds the
folder is the adoption; the merge creates the epic in the workspace.

| Epic | Cluster | Status | What it is |
|------|---------|--------|------------|
| [`strapi-launchpad/`](./strapi-launchpad/) | **SL** | ✅ Shipped (`baseline-v1`); live bootstrap pending | LaunchPad's Next.js front end (Vercel's LaunchPad: Next.js × Strapi Starter) on Cloudflare Workers, its Strapi reads cached in R2 + Durable Objects, the template's seed as sample content until a Strapi project is connected |

As-built ≠ intent: what shipped lives in each epic's `IMPLEMENTATION-STATUS.md`.
