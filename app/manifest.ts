import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Audit webu — Semakod',
    short_name: 'Audit webu',
    description:
      'Pravidly řízený audit rychlosti, SEO, AEO, GEO a technického stavu webu. Zdarma, bez registrace.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08080a',
    theme_color: '#08080a',
    lang: 'cs',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
