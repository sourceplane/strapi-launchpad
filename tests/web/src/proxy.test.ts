import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const visit = (path: string, acceptLanguage?: string) =>
  proxy(new NextRequest(`https://site.example${path}`, {
    headers: acceptLanguage === undefined ? {} : { "accept-language": acceptLanguage },
  }));

// The locale redirect every page path passes through (apps/web/proxy.ts).
describe("the locale proxy", () => {
  it("sends a request with no Accept-Language to the default locale, not a 500", () => {
    // Negotiator answers `*` here; upstream handed it to the matcher, which throws.
    // Upstream joins the locale to the path as `/<locale>/`; Next normalises it.
    expect(visit("/")?.headers.get("location")).toBe("https://site.example/en/");
    expect(visit("/pricing", "*")?.headers.get("location")).toBe("https://site.example/en/pricing");
  });

  it("sends a French visitor to /fr", () => {
    expect(visit("/", "fr-FR,fr;q=0.9")?.headers.get("location")).toBe("https://site.example/fr/");
  });

  it("leaves a path that already names its locale alone", () => {
    expect(visit("/en/blog", "fr")).toBeUndefined();
    expect(visit("/fr")).toBeUndefined();
  });
});
