#!/usr/bin/env python3
"""What a visitor does to the served Worker — testing/e2e.test.sh's stages 3 and 4.

    e2e-visit.py born      <url> <values.json> <site-origin>
    e2e-visit.py connected <url> <values.json> <site-origin>   (E2E_API, E2E_PREVIEW_SECRET)

`born` is a fresh product, no Strapi project: `/` redirects to the visitor's
locale; every page renders from the bundled sample (the template's own seed)
under the product's name, with the bar that says how to connect Strapi; the
seed's redirects redirect; a page that does not exist is a 404; the images
are the Worker's own; `/api/health` says `sample`; preview is refused.

`connected` is the same product built with the stand-in Strapi
(testing/lib/fake-strapi.py) as its project: the pages render from it and the
bar is gone; a second visit reads Strapi not at all (every read is a
`"use cache"` entry in the local R2 bucket), and a change in Strapi stays
cached; draft mode — entered only with the preview secret — reads the draft
from Strapi on every request, past the cache.
"""
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request

mode, base, values, origin = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3])), sys.argv[4]
name = values["productname"]
SAMPLE = os.environ.get("E2E_SAMPLE") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "apps", "web", "sample", "strapi")
problems = []


def bad(m):
    problems.append(m)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


opener = urllib.request.build_opener(NoRedirect)


def request(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=dict(headers or {}), method=method)
    try:
        r = opener.open(req, timeout=90)
    except urllib.error.HTTPError as e:
        r = e
    return r.status, r.headers, r.read()


def get(path, headers=None):
    s, h, b = request(base + path, headers=headers)
    return s, h, b.decode("utf-8", "replace")


def text_of(page):
    """The page's text as a visitor reads it: scripts, comments (React's text
    separators) and tags dropped, entities decoded, whitespace collapsed."""
    page = re.sub(r"<script\b.*?</script>", " ", page, flags=re.S)
    page = re.sub(r"<!--.*?-->", "", page, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", page)))


def title_of(page):
    """The document's title — not an inline SVG icon's own <title>."""
    page = re.sub(r"<svg\b.*?</svg>", "", page, flags=re.S)
    m = re.search(r"<title>(.*?)</title>", page, re.S)
    return html.unescape(m.group(1)) if m else None


def logo_name(page):
    m = re.search(r'<span class="text-white font-bold">(.*?)</span>', page, re.S)
    return html.unescape(m.group(1)) if m else None


def og_image(page):
    m = re.search(r'<meta property="og:image" content="([^"]*)"', page)
    return html.unescape(m.group(1)) if m else None


def sample(kind, locale):
    return json.load(open(os.path.join(SAMPLE, f"{kind}.{locale}.json")))


def home_of(locale):
    return next(p for p in sample("pages", locale) if p["slug"] == "homepage")


def done(summary):
    if problems:
        for p in problems:
            print(f"  ✕ {p}", file=sys.stderr)
        sys.exit(1)
    for line in summary:
        print(f"   {line}")
    sys.exit(0)


products = sample("products", "en")
articles = sample("articles", "en")
PAGES = ["/en", "/fr", "/en/pricing", "/en/faq", "/en/contact", "/fr/pricing", "/en/blog", "/fr/blog",
         "/en/products", f"/en/products/{products[0]['slug']}", f"/en/blog/{articles[0]['slug']}", "/en/sign-up"]

# ── a fresh product: no Strapi project ───────────────────────────────────
if mode == "born":
    s, h, _ = get("/")
    if s not in (307, 308) or not (h.get("Location") or "").rstrip("/").endswith("/en"):
        bad(f"/ with no Accept-Language answered {s} → {h.get('Location')!r}, not a redirect to /en")
    s, h, _ = get("/", {"Accept-Language": "fr-FR,fr;q=0.9"})
    if not (h.get("Location") or "").rstrip("/").endswith("/fr"):
        bad(f"/ for a French visitor redirected to {h.get('Location')!r}, not /fr")
    for path in PAGES:
        s, _, page = get(path)
        if s != 200:
            bad(f"{path} answered {s}")
            continue
        if 'data-testid="connect-strapi"' not in page:
            bad(f"{path} does not carry the connect-Strapi bar")
        if "NEXT_HTTP_ERROR_FALLBACK" in page:
            bad(f"{path} rendered Next's not-found page")
        if logo_name(page) not in (name, None):
            bad(f"{path}'s logo says {logo_name(page)!r}, not the product's name {name!r}")
    s, _, home = get("/en")
    if logo_name(home) != name:
        bad(f"the home page's logo says {logo_name(home)!r}, not {name!r}")
    want_title = home_of("en")["seo"]["metaTitle"]
    if title_of(home) != want_title:
        bad(f"the home page's title is {title_of(home)!r}, not the sample's {want_title!r}")
    hero = home_of("en")["dynamic_zone"][0].get("heading")
    if hero and hero not in text_of(home):
        bad(f"the home page does not show the sample's hero heading {hero!r}")
    img = og_image(home) or ""
    if not img.startswith(origin + "/uploads/"):
        bad(f"og:image is {img!r}, not an /uploads/ image on the site's own origin {origin}")
    s, _, signup = get("/en/sign-up")
    if f"Sign up for {name}" not in text_of(signup):
        bad("the sign-up page does not say 'Sign up for <the product's name>'")
    s, _, fr = get("/fr")
    fr_hero = home_of("fr")["dynamic_zone"][0].get("heading")
    if fr_hero and fr_hero not in text_of(fr):
        bad(f"/fr does not show the French sample's hero heading {fr_hero!r}")
    s, _, plist = get("/en/products")
    for p in products:
        if p["name"] not in text_of(plist):
            bad(f"/en/products does not list the sample product {p['name']!r}")
    s, h, _ = get("/en/i-have-a-question")
    if s not in (307, 308) or not (h.get("Location") or "").endswith("/en/faq"):
        bad(f"the seed's redirect /i-have-a-question answered {s} → {h.get('Location')!r}, not /en/faq")
    # A slug with no page is Next's not-found page, marked noindex. Its status
    # is 200: the template's loading boundary has streamed the shell before the
    # page can call notFound(), and Next answers a late notFound() that way.
    s, _, missing = get("/en/no-such-page")
    if s not in (200, 404) or "NEXT_HTTP_ERROR_FALLBACK;404" not in missing \
            or "could not be found" not in missing \
            or not re.search(r'<meta name="robots" content="noindex"', missing):
        bad(f"a page that does not exist answered {s} without Next's noindex not-found page")
    s, h, body = request(base + "/uploads/logo_6a13c79c4b.png")
    if s != 200 or h.get("Content-Type") != "image/png" or len(body) < 1000:
        bad(f"the sample's logo image answered {s} {h.get('Content-Type')}")
    s, _, health = get("/api/health")
    if s != 200 or json.loads(health) != {"ok": True, "content": "sample"}:
        bad(f"/api/health answered {s} {health!r}, not ok on the sample")
    s, _, _ = get("/api/preview?secret=anything&url=/en")
    if s != 401:
        bad(f"/api/preview with no PREVIEW_SECRET set answered {s}, not 401")
    done([f"{len(PAGES)} pages render from the sample under {name!r}, with the connect-Strapi bar",
          "/ redirects by Accept-Language (en, fr); the seed's redirect redirects; a missing page is Next's noindex not-found page",
          f"og:image on {origin}; the images are the Worker's own; /api/health says sample; preview refused"])

# ── connected: the stand-in Strapi ───────────────────────────────────────
api, secret = os.environ["E2E_API"], os.environ["E2E_PREVIEW_SECRET"]


def calls():
    return json.loads(urllib.request.urlopen(api + "/__calls", timeout=10).read())


s, _, health = get("/api/health")
if s != 200 or json.loads(health) != {"ok": True, "content": "strapi"}:
    bad(f"/api/health answered {s} {health!r}, not ok on Strapi")
# Each page's cache is checked within seconds of its first read: Next's
# `minutes` profile re-reads an entry in the background once it is a minute
# old, which is the cache working, not a miss — so no check spans a minute.
s, _, home = get("/en")
cached_title = title_of(home)
if cached_title != home_of("en")["seo"]["metaTitle"]:
    bad(f"the home page's title is {cached_title!r}, not the project's")
if f'src="{api}/uploads/' not in home:
    bad("the home page's images are not the project's media")
if 'data-testid="connect-strapi"' in home:
    bad("the home page still carries the connect-Strapi bar with Strapi connected")
# (The deploy's smoke visited `/` already, so the home page's reads are cached:
# its title and media are the project's, and the other pages' first reads below
# prove the site reads Strapi.)
read_home = calls()["api"]
get("/en")
if calls()["api"] != read_home:
    bad("a second visit to the home page read Strapi again — the reads are not cached")
req = urllib.request.Request(api + "/__set", data=json.dumps(
    {"type": "pages", "locale": "en", "slug": "homepage", "path": ["seo", "metaTitle"],
     "value": "Changed in Strapi"}).encode(), headers={"Content-Type": "application/json"}, method="POST")
urllib.request.urlopen(req, timeout=10)
s, _, home = get("/en")
if title_of(home) != cached_title or calls()["api"] != read_home:
    bad("a change in Strapi showed (or was read) while its cache entry was fresh")
reads = 0
for path in PAGES[1:]:
    before = calls()["api"]
    s, _, page = get(path)
    if s != 200:
        bad(f"{path} answered {s} with Strapi connected")
        continue
    if 'data-testid="connect-strapi"' in page:
        bad(f"{path} still carries the connect-Strapi bar with Strapi connected")
    after = calls()["api"]
    reads += after - before
    get(path)
    if calls()["api"] != after:
        bad(f"a second visit to {path} read Strapi again — its reads are not cached")
if reads == 0:
    bad("no page read anything from the stand-in Strapi")
s, h, _ = get("/en/i-have-a-question")
if s not in (307, 308) or not (h.get("Location") or "").endswith("/en/faq"):
    bad(f"the project's redirect /i-have-a-question answered {s} → {h.get('Location')!r} — the build did not read Strapi's redirections")
s, _, _ = get("/api/preview?secret=wrong&url=/en")
if s != 401:
    bad(f"/api/preview with the wrong secret answered {s}, not 401")
s, h, _ = get(f"/api/preview?secret={secret}&url=/en")
cookie = "; ".join(c.split(";", 1)[0] for c in (h.get_all("Set-Cookie") or []))
if s not in (307, 308) or "__prerender_bypass" not in cookie:
    bad(f"/api/preview with the secret answered {s} with cookies {cookie!r}, not draft mode")
before = calls()["draft"]
s, _, draft = get("/en", {"Cookie": cookie})
if title_of(draft) != "[draft] Changed in Strapi":
    bad(f"in draft mode the home page's title is {title_of(draft)!r}, not the project's draft")
get("/en", {"Cookie": cookie})
if calls()["draft"] - before < 2:
    bad("draft mode did not read the draft from Strapi on every request")
done([f"{len(PAGES)} pages render from Strapi ({reads} first reads beyond the home page); each second visit read Strapi 0 times; its redirects redirect",
      "a change in Strapi stays cached while fresh; draft mode, entered only with PREVIEW_SECRET, reads the draft every time"])
