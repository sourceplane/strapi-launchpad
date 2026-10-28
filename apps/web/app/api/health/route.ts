import { isStrapiConnected } from '@/lib/strapi';

// The deploy's smoke test and the deployment record's probe: answered by the
// Worker itself (no static file can), saying whether a Strapi project is
// connected or the site is serving its bundled sample content. Names no URL.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    ok: true,
    content: isStrapiConnected() ? 'strapi' : 'sample',
  });
}
