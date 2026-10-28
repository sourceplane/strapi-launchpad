# apps/web

The site: LaunchPad's Next.js front end ([strapi/LaunchPad](https://github.com/strapi/LaunchPad)
`next/`, MIT — `LICENSE.md`) on Cloudflare Workers + Static Assets through
`@opennextjs/cloudflare`. The repository's README has how to run, connect
Strapi and deploy it; `docs/` describes the component (generated from what it
declares).

| | |
|---|---|
| The pages and route handlers | `app/` |
| The blocks Strapi's dynamic zones render, the navbar, the footer | `components/` |
| Strapi's cached reads, and the switch to the sample | `lib/strapi/` |
| The sample content and its images | `sample/strapi/`, `public/uploads/` |
| The site's name | `lib/site.ts` |
| The build on Workers | `next.config.ts`, `open-next.config.ts`, `wrangler.template.jsonc` |
