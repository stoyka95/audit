import type { Metadata, Viewport } from 'next';
import { DM_Sans, Outfit } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import LocaleProvider from '@/components/LocaleProvider';

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-body',
});

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-display',
});

const SITE_URL = 'https://audit.semakod.cz';
const SITE_TITLE = 'Audit webu — Rychlost, SEO, AEO, GEO | Semakod';
const SITE_DESCRIPTION =
  'Vložte URL a během chvíle získáte pravidly řízený audit rychlosti, SEO, připravenosti na AI odpovědi a technického stavu webu. Zdarma, bez registrace.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s | Audit webu' },
  description: SITE_DESCRIPTION,
  keywords: [
    'audit webu',
    'SEO audit',
    'AEO audit',
    'GEO audit',
    'Core Web Vitals',
    'PageSpeed Insights',
    'kontrola webu zdarma',
    'Semakod',
  ],
  authors: [{ name: 'Mykola Stoyka', url: 'https://semakod.cz' }],
  creator: 'Semakod',
  publisher: 'Semakod',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: '/',
    languages: { cs: '/?lang=cs', en: '/?lang=en' },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Audit webu — Semakod',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'cs_CZ',
    alternateLocale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e7eaf2' },
    { media: '(prefers-color-scheme: dark)', color: '#08080a' },
  ],
};

/**
 * Nastaví motiv ještě před prvním vykreslením. Bez toho by se stránka na okamžik
 * mihla ve špatných barvách, protože React se rozbíhá až po parsování dokumentu.
 */
const THEME_BOOTSTRAP = `(function(){try{
var s=localStorage.getItem('theme');
var t=s==='light'||s==='dark'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

/**
 * Jazyk se řeší stejně jako motiv, a ze stejného důvodu: server neví, co má
 * návštěvník nastavené, takže by React musel jazyk přepnout až po hydrataci a
 * stránka by na okamžik problikla v češtině. Pořadí: adresa (?lang=), uložená
 * volba, jazyk prohlížeče.
 */
const LOCALE_BOOTSTRAP = `(function(){try{
var q=new URLSearchParams(location.search).get('lang');
var s=q||localStorage.getItem('locale');
if(s!=='cs'&&s!=='en'){s=(navigator.language||'cs').toLowerCase().indexOf('cs')===0?'cs':'en';}
document.documentElement.setAttribute('lang',s);
if(q==='cs'||q==='en')localStorage.setItem('locale',q);
}catch(e){document.documentElement.setAttribute('lang','cs');}})();`;

/**
 * Strukturovaná data webu samotného (ne auditovaných stránek). Propojuje
 * nástroj s vydavatelem Semakod a nese jméno provozovatele pro AI vyhledávače
 * a Google Knowledge Graph.
 */
const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Audit webu',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: 'SEO tool',
      operatingSystem: 'Any (web)',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CZK' },
      inLanguage: ['cs', 'en'],
      publisher: { '@id': 'https://semakod.cz/#organization' },
      author: { '@id': 'https://semakod.cz/#organization' },
    },
    {
      '@type': 'Organization',
      '@id': 'https://semakod.cz/#organization',
      name: 'Semakod',
      url: 'https://semakod.cz',
      founder: { '@type': 'Person', name: 'Mykola Stoyka' },
      sameAs: ['https://github.com/stoyka95'],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" data-theme="light" className={`${dmSans.variable} ${outfit.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOTSTRAP }} />
        {/* Odhalování při scrollu řídí JavaScript. Bez něj by sekce zůstaly
            průhledné, proto je bez skriptu rovnou zobrazíme. */}
        <noscript>
          <style>{'.reveal{opacity:1 !important;transform:none !important}'}</style>
        </noscript>
      </head>
      <body className="ambient grain min-h-screen">
        <LocaleProvider>
          <div className="relative z-[2]">{children}</div>
          <CookieConsent />
        </LocaleProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
