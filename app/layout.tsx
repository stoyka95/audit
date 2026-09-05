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
const SITE_TITLE = 'Audit webu zdarma — rychlost, SEO, AEO a GEO | Semakod';
const SITE_DESCRIPTION =
  'Online kontrola webu zdarma a bez registrace. Vložte adresu a do dvou minut máte 35 měřených ' +
  'kontrol: Core Web Vitals, SEO, připravenost na odpovědi AI a technický stav — s konkrétními ' +
  'doporučeními a exportem do PDF.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s | Audit webu' },
  description: SITE_DESCRIPTION,
  /**
   * Google keywords dávno neváží, ale ostatní vyhledávače a hlavně jazykové
   * modely tenhle seznam čtou jako rychlý popis oboru. Proto jsou tu skutečné
   * fráze, které lidé hledají, ne slovníkové jednoslovné termíny.
   */
  keywords: [
    'audit webu zdarma',
    'kontrola webu zdarma',
    'analýza webu online',
    'SEO audit zdarma',
    'test rychlosti webu',
    'kontrola SEO online',
    'AEO audit',
    'GEO audit',
    'test přístupnosti webu',
    'optimalizace pro AI vyhledávání',
    'Core Web Vitals test',
    'PageSpeed Insights česky',
    'audit webových stránek',
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
  /**
   * Ikony vedou na statické soubory s neměnnou adresou. Dřív je generovala
   * trasa /icon o velikosti 32 px — jenže Google pro favicon ve výsledcích
   * hledání vyžaduje čtverec v násobku 48 px, takže místo ikony ukazoval
   * obecný glóbus. Stabilní adresa navíc přežije nasazení, takže se ikona
   * nemusí pokaždé znovu procházet.
   */
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon-48.png', type: 'image/png', sizes: '48x48' },
      { url: '/icon.png', type: 'image/png', sizes: '96x96' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon',
  },
  alternates: {
    canonical: '/',
    languages: { cs: '/?lang=cs', en: '/?lang=en', 'x-default': '/' },
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
 * stránka by na okamžik problikla v jiné řeči. Pořadí: adresa (?lang=), pak
 * uložená volba.
 *
 * Podle jazyka prohlížeče se schválně neřídí. Googlebot prochází web
 * s anglickým nastavením, takže se mu stránka přepnula do angličtiny a do
 * výsledků hledání se na české adrese dostal anglický titulek i popisek —
 * přestože kanonická verze i `x-default` míří na češtinu. Angličtinu si
 * návštěvník zapne přepínačem a volba mu zůstane.
 */
const LOCALE_BOOTSTRAP = `(function(){try{
var q=new URLSearchParams(location.search).get('lang');
var s=q||localStorage.getItem('locale');
if(s!=='cs'&&s!=='en'){s='cs';}
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
