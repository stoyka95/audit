import Script from 'next/script';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

/**
 * Vykreslí se jedině z CookieConsent, a jen po souhlasu — nikdy samostatně.
 * GA4 a případné další tagy (Bing UET, Google Ads…) se přidávají uvnitř
 * rozhraní Tag Manageru, ne tady v kódu. Bez GTM_ID se nevykreslí nic.
 *
 * Vynechává se klasický <noscript> fallback pro vypnutý JavaScript — tenhle
 * souhlas je celý řízený Reactem, takže bez JS by se stejně nezobrazila
 * lišta ani volba, a fallback by tak tiše sledoval návštěvníky, kteří nikdy
 * neměli šanci souhlas odmítnout.
 */
export default function GoogleTagManager() {
  if (!GTM_ID) return null;
  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}
