import { afterEach, describe, expect, it, vi } from "vitest";

// The client's switch: with no Strapi URL at build (every fresh product), each
// read is the sample's and nothing is fetched — not even draft mode's check,
// which needs a request.
describe("the Strapi client before a project is connected (apps/web/lib/strapi/client.ts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("reads the sample and fetches nothing", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const fetch = vi.fn(() => {
      throw new Error("fetched");
    });
    vi.stubGlobal("fetch", fetch);
    const { fetchCollectionType, fetchSingleType, isStrapiConnected } = await import("@/lib/strapi");
    expect(isStrapiConnected()).toBe(false);
    const global = await fetchSingleType<{ navbar: unknown }>("global", { locale: "en" });
    expect(global.navbar).toBeTruthy();
    const [home] = await fetchCollectionType<{ slug: string }[]>("pages", {
      filters: { slug: { $eq: "homepage" }, locale: "en" },
    });
    expect(home?.slug).toBe("homepage");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is connected once a Strapi URL was set at build", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://example.strapiapp.com");
    const { isStrapiConnected } = await import("@/lib/strapi");
    expect(isStrapiConnected()).toBe(true);
  });
});
