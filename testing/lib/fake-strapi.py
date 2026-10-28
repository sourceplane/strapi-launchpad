#!/usr/bin/env python3
"""A stand-in Strapi for testing/e2e.test.sh — offline, stdlib only.

    fake-strapi.py --sample <apps/web/sample/strapi> --uploads <apps/web/public/uploads> --port N

It answers the REST reads the site makes through @strapi/client, from the
same documents the site ships as its sample (the template's seed, as a real
Strapi returned it): `GET /api/<single>?locale=xx` and
`GET /api/<collection>?…filters[slug][$eq]=…&locale=xx`, published or draft,
and `GET /api/redirections` (not localized), which the build reads.
A draft read (`status=draft`) answers the same documents with every
`metaTitle` prefixed `[draft] `, so a test can tell which one the site asked
for. Media under `/uploads/` are served from the site's own copies.

Control endpoints, for the test only:
    GET  /__calls            {"api": N, "draft": N}  reads answered so far
    POST /__set              {"type": "pages", "locale": "en", "slug": "homepage",
                              "path": ["seo", "metaTitle"], "value": "…"}
                             changes one field of one document (or of a single
                             type, without "slug") from now on
"""
import argparse
import copy
import json
import os
import re
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ap = argparse.ArgumentParser()
ap.add_argument("--sample", required=True)
ap.add_argument("--uploads", required=True)
ap.add_argument("--port", type=int, required=True)
args = ap.parse_args()

DOCS = {}
for f in os.listdir(args.sample):
    m = re.fullmatch(r"(.+)\.([a-z]{2})\.json", f)
    if m:
        DOCS.setdefault(m.group(1), {})[m.group(2)] = json.load(open(os.path.join(args.sample, f)))
    elif f.endswith(".json"):
        # A collection with no locale (`redirections`): the same documents in every locale.
        DOCS[f[:-5]] = {"*": json.load(open(os.path.join(args.sample, f)))}
CALLS = {"api": 0, "draft": 0}


def bracket_params(query):
    """`filters[slug][$eq]=x&locale=en` → {"filters": {"slug": {"$eq": "x"}}, "locale": "en"}."""
    out = {}
    for key, values in urllib.parse.parse_qs(query, keep_blank_values=True).items():
        parts = [key.split("[", 1)[0]] + re.findall(r"\[([^\]]*)\]", key)
        node = out
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node[parts[-1]] = values[-1]
    return out


def value_of(v):
    return v.get("$eq") if isinstance(v, dict) else v


def drafted(doc):
    doc = copy.deepcopy(doc)

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k == "metaTitle" and isinstance(v, str):
                    o[k] = "[draft] " + v
                else:
                    walk(v)
        elif isinstance(o, list):
            for x in o:
                walk(x)

    walk(doc)
    return doc


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, status, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urllib.parse.urlsplit(self.path)
        if url.path == "/__calls":
            return self.send(200, CALLS)
        if url.path.startswith("/uploads/"):
            p = os.path.join(args.uploads, os.path.basename(url.path))
            if not os.path.isfile(p):
                return self.send(404, {"error": "not found"})
            ext = p.rsplit(".", 1)[-1].lower()
            ctype = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "svg": "image/svg+xml",
                     "webp": "image/webp"}.get(ext, "application/octet-stream")
            return self.send(200, open(p, "rb").read(), ctype)
        m = re.fullmatch(r"/api/([a-z-]+)", url.path)
        if not m or m.group(1) not in DOCS:
            return self.send(404, {"data": None, "error": {"status": 404, "name": "NotFoundError"}})
        q = bracket_params(url.query)
        filters = q.get("filters") or {}
        locale = q.get("locale") or value_of(filters.get("locale")) or "en"
        draft = q.get("status") == "draft"
        CALLS["api"] += 1
        CALLS["draft"] += 1 if draft else 0
        docs = DOCS[m.group(1)].get(locale, DOCS[m.group(1)].get("*"))
        if isinstance(docs, list):
            slug = value_of(filters.get("slug"))
            data = [d for d in docs if slug is None or d.get("slug") == slug]
            data = [drafted(d) for d in data] if draft else data
            meta = {"pagination": {"page": 1, "pageSize": 25, "pageCount": 1, "total": len(data)}}
            return self.send(200, {"data": data, "meta": meta})
        if docs is None:
            return self.send(404, {"data": None, "error": {"status": 404, "name": "NotFoundError"}})
        return self.send(200, {"data": drafted(docs) if draft else docs, "meta": {}})

    def do_POST(self):
        if self.path != "/__set":
            return self.send(404, {})
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
        docs = DOCS[body["type"]][body["locale"]]
        doc = next(d for d in docs if d.get("slug") == body["slug"]) if isinstance(docs, list) else docs
        node = doc
        for k in body["path"][:-1]:
            node = node[k]
        node[body["path"][-1]] = body["value"]
        return self.send(200, {"ok": True})


ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
