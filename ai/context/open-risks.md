# strapi-launchpad — open risks

What is not yet proven or not yet decided. The full write-up of every risk,
including the accepted and resolved ones, is
`specs/epics/strapi-launchpad/risks-and-open-questions.md`; this page lists
only what is still live, so it should be short.

| ID | Risk | State | What closes it |
|---|---|---|---|
| SL-A | No live bootstrap yet: the repository created and linked, the two tokens minted, a real `terraform apply`, a real `wrangler deploy` with the R2 and Durable Object bindings, the probes | OPEN | One bootstrap from a tag against a workspace |
| SL-B | No real Strapi project connected: a Strapi Cloud project running LaunchPad's `strapi/` app, its CORS and Public-role permissions, and its preview button are untested | OPEN | A Strapi Cloud project connected once |
| SL-C | Cache Components off until @opennextjs/cloudflare runs them on workerd | ACCEPTED | An npm release with a fix for opennextjs-cloudflare#1450 |
| SL-I | LaunchPad declares MIT (its `next/README.md`, `strapi/package.json`) but ships no LICENSE file; `apps/web/LICENSE.md` is the standard MIT text with LaunchPad's authors as holders | OPEN — for the registry's owner to review | A LICENSE in strapi/LaunchPad, or a decision |

Accepted, and worth knowing before you change them: SL-D (Next pinned to
16.3.8 with the adapter), SL-E (images unoptimized), SL-F (the sample is the
seed as published — its English hero reads "(Draft) …"), SL-G (the stand-in
is not a real Strapi), SL-H (the site-name seam; gated).
