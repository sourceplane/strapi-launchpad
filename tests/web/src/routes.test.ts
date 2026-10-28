import { afterEach, describe, expect, it, vi } from "vitest";

describe("the Worker's own routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("/api/health says ok, and whether it serves the sample or Strapi", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const sample = await import("@/app/api/health/route");
    expect(await sample.GET().json()).toEqual({ ok: true, content: "sample" });
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://example.strapiapp.com");
    const strapi = await import("@/app/api/health/route");
    expect(await strapi.GET().json()).toEqual({ ok: true, content: "strapi" });
  });

  it("/api/preview refuses a request without the preview secret, set or not", async () => {
    const { GET } = await import("@/app/api/preview/route");
    expect((await GET(new Request("https://site.example/api/preview?url=/en"))).status).toBe(401);
    vi.stubEnv("PREVIEW_SECRET", "the-right-one");
    expect((await GET(new Request("https://site.example/api/preview?secret=wrong&url=/en"))).status).toBe(401);
  });
});
