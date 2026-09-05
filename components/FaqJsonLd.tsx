import { ui } from '@/lib/i18n/ui';

/**
 * Server komponenta, ne 'use client' — schéma musí sedět na obsah, který
 * dorazí v prvním HTML (čeština, viz LOCALE_BOOTSTRAP v layout.tsx), ne na
 * to, co si prohlížeč případně přepne po hydrataci. Bere proto slovník
 * napřímo, ne přes useLocale.
 */
export default function FaqJsonLd() {
  const { faq } = ui('cs');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
