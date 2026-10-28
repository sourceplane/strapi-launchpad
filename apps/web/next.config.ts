import type { NextConfig } from "next";
import path from "node:path";

import { sampleRedirections } from "./lib/strapi/sample-redirections";

// The Strapi project the site reads — its public URL, e.g.
// https://<project>.strapiapp.com. A deploy takes it from the environment's
// STRAPI_URL Orun secret (apps/web/component.yaml); unset, it is empty and the
// site renders the bundled sample content (lib/strapi/sample.ts), the
// template's own seed. The template names it NEXT_PUBLIC_API_URL, which both
// server and browser code read (lib/utils.ts), so it is inlined at build.
const STRAPI_URL = (process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // The template turns on Cache Components. On Cloudflare Workers through
  // @opennextjs/cloudflare 1.20.11 a Cache Components page answers 500 and
  // then hangs (opennextjs-cloudflare #1450, fix unreleased), so the build
  // keeps the template's `"use cache"` reads (lib/strapi/client.ts:
  // cacheLife, cacheTag) with `useCache` and renders pages per request.
  experimental: {
    useCache: true,
  },
  // Every image is a Strapi media file (or, before a project is connected, a
  // bundled sample under /uploads): a Worker has no image optimiser.
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: STRAPI_URL,
  },
  pageExtensions: ["ts", "tsx"],
  // The template's redirects, read from Strapi's `redirections` collection at
  // build time; before a project is connected, from the sample's.
  async redirects() {
    let items: { source: string; destination: string }[] = [];
    if (!STRAPI_URL) {
      items = sampleRedirections;
    } else {
      try {
        const res = await fetch(`${STRAPI_URL}/api/redirections`);
        const result = (await res.json()) as { data?: { source: string; destination: string }[] | null };
        if (!res.ok || !Array.isArray(result.data)) {
          throw new Error(`GET /api/redirections answered ${res.status}`);
        }
        items = result.data;
      } catch (error) {
        // Redirects are optional; a build never fails on them (upstream's rule).
        console.warn(
          "[next.config] Failed to fetch redirects from Strapi:",
          error instanceof Error ? error.message : error,
        );
      }
    }
    return items.map(({ source, destination }) => ({
      source: `/:locale${source}`,
      destination: `/:locale${destination}`,
      permanent: false,
    }));
  },
  // Required by @opennextjs/cloudflare, which bundles `.next/standalone/**`
  // into the Worker. Trace from the monorepo root so workspace dependencies
  // resolve from the root node_modules.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
