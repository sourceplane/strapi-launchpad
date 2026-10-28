import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import seoData from "@/lib/next-metadata";
import { SITE_NAME, SOURCE_URL } from "@/lib/site";
import { sampleRedirections } from "@/lib/strapi/sample-redirections";

const app = path.resolve(__dirname, "../../../apps/web");
const read = (f: string) => readFileSync(path.join(app, f), "utf8");

// The one line a product's bootstrap rewrites (tooling/rebrand's site-name
// seam): every place upstream spelled the site's name in code now reads it.
describe("the site's name (apps/web/lib/site.ts)", () => {
  it("is one literal line, as the rename's seam reads it", () => {
    const m = /^export const SITE_NAME = (".*");$/m.exec(read("lib/site.ts"));
    expect(m, "the SITE_NAME line").not.toBeNull();
    expect(JSON.parse(m![1]!)).toBe(SITE_NAME);
    expect(SITE_NAME.trim()).not.toBe("");
  });

  it("is what the logo, the sign-up heading and the default metadata read", () => {
    expect(read("components/logo.tsx")).toContain("{SITE_NAME}");
    expect(read("components/register.tsx")).toContain("Sign up for {SITE_NAME}");
    expect(seoData.title.startsWith(`${SITE_NAME} - `)).toBe(true);
    expect(seoData.openGraph.title.startsWith(`${SITE_NAME} - `)).toBe(true);
    expect(seoData.openGraph.site_name).toBe(SITE_NAME);
  });

  it("links its own repository", () => {
    expect(SOURCE_URL).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
    expect(read("components/banner.tsx")).toContain("${SOURCE_URL}#connecting-strapi");
  });
});

describe("the build on Workers (apps/web/next.config.ts)", () => {
  const config = read("next.config.ts");

  it("keeps the template's `\"use cache\"` reads without Cache Components", () => {
    expect(config).toMatch(/useCache: true/);
    expect(config).not.toMatch(/cacheComponents:\s*true/);
    expect(read("lib/strapi/client.ts")).toContain("'use cache'");
  });

  it("serves images as they are and builds standalone for OpenNext", () => {
    expect(config).toMatch(/unoptimized: true/);
    expect(config).toMatch(/output: "standalone"/);
  });

  it("inlines the Strapi URL from STRAPI_URL as the template's NEXT_PUBLIC_API_URL", () => {
    expect(config).toMatch(/process\.env\.STRAPI_URL/);
    expect(config).toMatch(/NEXT_PUBLIC_API_URL: STRAPI_URL/);
  });

  it("redirects by the seed's redirections before a project is connected", () => {
    expect(sampleRedirections).toEqual([
      { source: "/i-have-a-question", destination: "/faq" },
      { source: "/producs", destination: "/products" },
    ]);
  });
});
