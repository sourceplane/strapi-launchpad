import { Metadata } from 'next';
import { ViewTransitions } from 'next-view-transitions';
import localFont from 'next/font/local';
import { draftMode } from 'next/headers';
import type { PropsWithChildren } from 'react';
import React from 'react';

import { Banner } from '@/components/banner';
import { DraftModeBanner } from '@/components/draft-mode-banner';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { AIToast } from '@/components/toast';
import { CartProvider } from '@/context/cart-context';
import { generateMetadataObject } from '@/lib/shared/metadata';
import { fetchSingleType, isStrapiConnected } from '@/lib/strapi';
import { cn } from '@/lib/utils';
import type { LocaleParamsProps } from '@/types/types';

// Inter, self-hosted: the variable font's latin subset (weights 100–900,
// covering the template's 400–900), from @fontsource-variable/inter 5.2.8 —
// OFL-1.1, ../fonts/Inter-OFL.txt. Upstream fetched it from Google Fonts at
// build time, which fails on GitHub's runners (Google answers a font URL
// without an extension, which next/font's loader cannot read).
const inter = localFont({
  src: '../fonts/inter-latin-wght-normal.woff2',
  display: 'swap',
  weight: '100 900',
});

// Default Global SEO for pages without them
export async function generateMetadata({
  params,
}: PropsWithChildren<LocaleParamsProps>): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await fetchSingleType('global', { locale });

  const seo = pageData.seo;
  const metadata = generateMetadataObject(seo);
  return metadata;
}

export default async function LocaleLayout({
  children,
  params,
}: PropsWithChildren<LocaleParamsProps>) {
  const { isEnabled: isDraftMode } = await draftMode();
  const { locale } = await params;
  const pageData = await fetchSingleType('global', { locale });
  const isDemo = process.env.NEXT_IS_DEMO === 'true';
  const isSample = !isStrapiConnected();

  return (
    <ViewTransitions>
      <CartProvider>
        <div
          className={cn(
            inter.className,
            'bg-charcoal antialiased h-full w-full'
          )}
        >
          {(isDemo || isSample) && <Banner sample={isSample} />}
          <Navbar data={pageData.navbar} locale={locale} hasBanner={isDemo || isSample} />
          {children}
          <Footer data={pageData.footer} locale={locale} />
          <AIToast />
          {isDraftMode && <DraftModeBanner />}
        </div>
      </CartProvider>
    </ViewTransitions>
  );
}
