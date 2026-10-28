import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { SAMPLE_TYPES, localeOf, sampleCollection, sampleDocument, sampleSingle } from "@/lib/strapi/sample";

const app = path.resolve(__dirname, "../../../apps/web");

// The content a fresh site renders: the template's own seed, as Strapi
// returned it (apps/web/sample/strapi), answering the queries the pages make.
describe("the sample content (apps/web/lib/strapi/sample.ts)", () => {
  it("has every single type and collection the pages read, in both locales", () => {
    expect(SAMPLE_TYPES.singles.sort()).toEqual(["blog-page", "global", "product-page"]);
    expect(SAMPLE_TYPES.collections.sort()).toEqual(["articles", "pages", "products"]);
    for (const locale of ["en", "fr"]) {
      for (const single of SAMPLE_TYPES.singles) {
        expect(sampleSingle<{ locale: string }>(single, { locale })?.locale).toBe(locale);
      }
      for (const coll of SAMPLE_TYPES.collections) {
        expect(sampleCollection<unknown[]>(coll, { locale }).length).toBeGreaterThan(0);
      }
    }
  });

  it("answers a page by slug and locale, as the pages ask (filters.slug.$eq, filters.locale)", () => {
    const [home] = sampleCollection<{ slug: string; locale: string }[]>("pages", {
      filters: { slug: { $eq: "homepage" }, locale: "fr" },
    });
    expect(home).toMatchObject({ slug: "homepage", locale: "fr" });
    const [faq] = sampleCollection<{ slug: string }[]>("pages", { filters: { slug: { $eq: "faq" } }, locale: "en" });
    expect(faq?.slug).toBe("faq");
  });

  it("filters articles by `filters.locale.$eq` as the blog index asks", () => {
    const fr = sampleCollection<{ locale: string }[]>("articles", { filters: { locale: { $eq: "fr" } } });
    expect(fr.length).toBeGreaterThan(0);
    expect(fr.every((a) => a.locale === "fr")).toBe(true);
  });

  it("answers an unknown slug, collection or locale empty — never a throw", () => {
    expect(sampleCollection<unknown[]>("pages", { filters: { slug: { $eq: "no-such-page" } }, locale: "en" })).toEqual([]);
    expect(sampleCollection<unknown[]>("no-such-collection", { locale: "en" })).toEqual([]);
    expect(sampleCollection<unknown[]>("pages", { locale: "de" })).toEqual([]);
    expect(sampleSingle("no-such-single", { locale: "en" })).toBeNull();
    expect(sampleDocument("products", "no-such-id", { locale: "en" })).toBeNull();
  });

  it("falls back to English for a single type in a locale it does not have", () => {
    expect(sampleSingle<{ locale: string }>("global", { locale: "de" })?.locale).toBe("en");
    expect(localeOf(undefined)).toBe("en");
  });

  it("finds a product by documentId", () => {
    const [p] = sampleCollection<{ documentId: string; slug: string }[]>("products", { locale: "en" });
    expect(sampleDocument<{ slug: string }>("products", p!.documentId, { locale: "en" })?.slug).toBe(p!.slug);
  });

  it("ships every image it names, and no size variant it does not", () => {
    const dir = path.join(app, "sample/strapi");
    const urls = new Set<string>();
    for (const f of readdirSync(dir)) {
      const text = readFileSync(path.join(dir, f), "utf8");
      expect(text).not.toContain('"formats"');
      expect(text).not.toMatch(/https?:\/\/(localhost|127\.0\.0\.1)/);
      for (const m of text.matchAll(/"(\/uploads\/[^"]+)"/g)) urls.add(m[1]!);
    }
    expect(urls.size).toBeGreaterThan(10);
    for (const u of urls) expect(existsSync(path.join(app, "public", u)), u).toBe(true);
  });
});
