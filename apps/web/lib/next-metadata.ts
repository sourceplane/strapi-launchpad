import { SITE_NAME } from './site';

const seoData = {
  title: `${SITE_NAME} - Your content delivery partner for large scale applications`,
  description: `A platform integrating Aceternity with Strapi for seamless content management.`,
  image: 'https://ui.aceternity.com/banner.png',
  openGraph: {
    type: 'website',
    title: `${SITE_NAME} - Your content delivery partner for large scale applications`,
    url: 'https://ui.aceternity.com', // TODO: Fix this
    description: `A platform integrating Aceternity with Strapi for seamless content management.`,
    locale: 'en_EN',
    keywords: 'content, delivery, web, hosting',
    images: [
      {
        width: 1200,
        height: 630,
        url: `https://ui.aceternity.com/banner.png`, // TODO: Fix this
      },
    ],
    site_name: SITE_NAME,
  },
  twitter: {
    handle: '@mannupaaji',
    site: 'ui.aceternity.com', // TODO: Fix this
    cardType: 'summary_large_image',
  },
};

export default seoData;
