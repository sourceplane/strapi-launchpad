/**
 * The site's content before a Strapi project is connected: the template's own
 * seed (strapi/LaunchPad `strapi/data/export_20250116105447.tar.gz`), as Strapi
 * returns it — each single type and collection read from a Strapi that had
 * imported that export, through the populate middlewares the template's
 * Strapi applies, in both locales. Size variants (`formats`) are left out:
 * nothing in the site reads them; the originals are under public/uploads.
 *
 * It answers exactly the queries the pages make: a single type by locale, and
 * a collection by locale, optionally where `slug` equals a value (or a
 * document by its documentId). Anything else is answered empty, never thrown.
 */
import blogPageEn from '../../sample/strapi/blog-page.en.json';
import blogPageFr from '../../sample/strapi/blog-page.fr.json';
import globalEn from '../../sample/strapi/global.en.json';
import globalFr from '../../sample/strapi/global.fr.json';
import productPageEn from '../../sample/strapi/product-page.en.json';
import productPageFr from '../../sample/strapi/product-page.fr.json';
import articlesEn from '../../sample/strapi/articles.en.json';
import articlesFr from '../../sample/strapi/articles.fr.json';
import pagesEn from '../../sample/strapi/pages.en.json';
import pagesFr from '../../sample/strapi/pages.fr.json';
import productsEn from '../../sample/strapi/products.en.json';
import productsFr from '../../sample/strapi/products.fr.json';

type Doc = Record<string, unknown>;

const SINGLES: Record<string, Record<string, Doc>> = {
  global: { en: globalEn as Doc, fr: globalFr as Doc },
  'blog-page': { en: blogPageEn as Doc, fr: blogPageFr as Doc },
  'product-page': { en: productPageEn as Doc, fr: productPageFr as Doc },
};

const COLLECTIONS: Record<string, Record<string, Doc[]>> = {
  pages: { en: pagesEn as Doc[], fr: pagesFr as Doc[] },
  products: { en: productsEn as Doc[], fr: productsFr as Doc[] },
  articles: { en: articlesEn as Doc[], fr: articlesFr as Doc[] },
};

const DEFAULT_LOCALE = 'en';

type Query = {
  locale?: unknown;
  filters?: Record<string, unknown>;
};

/** The locale a query names: `locale`, or a `filters.locale` (bare or `$eq`). */
export function localeOf(options?: Query): string {
  const direct = options?.locale;
  if (typeof direct === 'string' && direct) return direct;
  const f = options?.filters?.locale;
  if (typeof f === 'string' && f) return f;
  if (f && typeof f === 'object' && typeof (f as { $eq?: unknown }).$eq === 'string') {
    return (f as { $eq: string }).$eq;
  }
  return DEFAULT_LOCALE;
}

/** The slug a query filters on (`filters.slug.$eq`, or a bare string), if any. */
function slugOf(options?: Query): string | undefined {
  const s = options?.filters?.slug;
  if (typeof s === 'string') return s;
  if (s && typeof s === 'object' && typeof (s as { $eq?: unknown }).$eq === 'string') {
    return (s as { $eq: string }).$eq;
  }
  return undefined;
}

export function sampleSingle<T>(name: string, options?: Query): T {
  const byLocale = SINGLES[name];
  const doc = byLocale?.[localeOf(options)] ?? byLocale?.[DEFAULT_LOCALE] ?? null;
  return doc as T;
}

export function sampleCollection<T>(name: string, options?: Query): T {
  const byLocale = COLLECTIONS[name];
  const docs = byLocale?.[localeOf(options)] ?? [];
  const slug = slugOf(options);
  return (slug === undefined ? docs : docs.filter((d) => d.slug === slug)) as T;
}

export function sampleDocument<T>(name: string, documentId: string, options?: Query): T {
  const byLocale = COLLECTIONS[name];
  const docs = byLocale?.[localeOf(options)] ?? [];
  return (docs.find((d) => d.documentId === documentId) ?? null) as T;
}

/** Sample collections and single types, by name — what tests and docs list. */
export const SAMPLE_TYPES = {
  singles: Object.keys(SINGLES),
  collections: Object.keys(COLLECTIONS),
};
