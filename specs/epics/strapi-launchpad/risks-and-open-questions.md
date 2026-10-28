# strapi-launchpad — risks and open questions

| ID | Risk | State | Notes |
|---|---|---|---|
| SL-A | Not proven live: the repository and link, the minted tokens, a real `terraform apply` and `wrangler deploy`, the probes | OPEN | Baseline CI proves everything else offline; one bootstrap closes it |
| SL-B | No real Strapi project connected: Strapi Cloud running LaunchPad's `strapi/` app, its CORS and Public-role permissions, its preview button | OPEN | The stand-in answers the same reads from the same seed; one Strapi Cloud project closes it |
| SL-C | Cache Components off | ACCEPTED | opennextjs-cloudflare#1450 / #1318; every page reads draft mode, so none was prerendered upstream either; turning them back on needs no change to the `"use cache"` reads |
| SL-D | Next pinned to 16.3.8 | ACCEPTED | @opennextjs/cloudflare 1.20.11's floor; upstream locked 16.3.1 |
| SL-E | Images unoptimized, `sharp` dropped | ACCEPTED | Workers has no Next.js image optimizer; Strapi's media are served as uploaded |
| SL-F | The sample is the seed as published: its English hero reads "(Draft) Launch your content into orbit", as upstream's export has it | ACCEPTED | It is the template's own content, replaced by a connected project |
| SL-G | The e2e's Strapi is a stand-in: the seed's documents, the site's reads (single types, collections by slug and locale, drafts) — not Strapi's query engine | ACCEPTED | A real project is SL-B |
| SL-H | The site's name: the rename rewrites one line and the sweep does not look for it | ACCEPTED, gated | The leak gate fails any other spelling in `apps/web` code; the placement and e2e tiers check the branded product |
| SL-I | Licence: LaunchPad declares MIT (`next/README.md`, `strapi/package.json`) but ships no LICENSE file | OPEN | `apps/web/LICENSE.md` is the standard MIT text with LaunchPad's authors as holders and says so; the registry owner's call before a public row |
| SL-J | The sample's images (40 files, 3.6 MB) ship in the repository | ACCEPTED | The originals the pages name; the seed's size variants (about 20 MB) are left out |
| SL-K | `cacheLife('minutes')` re-reads an entry in the background once it is a minute old | ACCEPTED | Upstream's profile; the e2e checks each page's cache within seconds of its first read |
