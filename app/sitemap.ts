import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://audit.semakod.cz/',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
      alternates: {
        languages: {
          cs: 'https://audit.semakod.cz/?lang=cs',
          en: 'https://audit.semakod.cz/?lang=en',
        },
      },
    },
  ];
}
