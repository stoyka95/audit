/**
 * Ruční route místo typované konvence `robots.ts` — potřebujeme komentář
 * odkazující na /llms.txt, který typ MetadataRoute.Robots neumí zapsat.
 * Vlastní GEO kontrola nástroje (lib/checks/geo.ts) přesně tohle hledá
 * regulárním výrazem v syrovém textu souboru.
 */
export const dynamic = 'force-static';

const BODY = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://audit.semakod.cz/sitemap.xml

# Stručný přehled webu pro jazykové modely: https://audit.semakod.cz/llms.txt
`;

export function GET() {
  return new Response(BODY, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
