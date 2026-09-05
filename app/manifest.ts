import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Audit webu — Semakod',
    short_name: 'Audit webu',
    description:
      'Audit webu zdarma: rychlost, SEO, AEO, GEO a technický stav. Bez registrace, výsledek do dvou minut.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08080a',
    theme_color: '#08080a',
    lang: 'cs',
    icons: [
      { src: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { src: '/icon.png', sizes: '96x96', type: 'image/png' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
