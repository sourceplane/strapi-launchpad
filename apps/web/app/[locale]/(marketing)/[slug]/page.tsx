import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ClientSlugHandler from '../ClientSlugHandler';
import PageContent from '@/lib/shared/PageContent';
import { generateMetadataObject } from '@/lib/shared/metadata';
import { fetchCollectionType } from '@/lib/strapi';
import type { LocaleSlugParamsProps } from '@/types/types';

export async function generateMetadata({
  params,
}: LocaleSlugParamsProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const [pageData] = await fetchCollectionType('pages', {
    filters: {
      slug: {
        $eq: slug,
      },
      locale: locale,
    },
  });

  // A slug with no page is a 404 (upstream read `.seo` of undefined).
  if (!pageData) notFound();

  const seo = pageData.seo;
  const metadata = generateMetadataObject(seo);
  return metadata;
}

export default async function Page({ params }: LocaleSlugParamsProps) {
  const { slug, locale } = await params;
  const [pageData] = await fetchCollectionType('pages', {
    filters: {
      slug: {
        $eq: slug,
      },
      locale: locale,
    },
  });

  if (!pageData) notFound();

  const localizedSlugs = pageData.localizations?.reduce(
    (acc: Record<string, string>, localization: any) => {
      acc[localization.locale] = localization.slug;
      return acc;
    },
    { [locale]: slug }
  );

  return (
    <>
      <ClientSlugHandler localizedSlugs={localizedSlugs} />
      <PageContent pageData={pageData} />
    </>
  );
}
