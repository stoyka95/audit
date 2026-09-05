import { formatPercent } from '../format';
import { translator } from '../i18n';
import { ramp, type RampAnchors } from '../scoring';
import type { AuditContext, CheckResult } from '../types';

/** Podíl rozbitých interních odkazů v procentech. */
const BROKEN_LINK_ANCHORS: RampAnchors = { good: 0, poor: 20, zero: 60 };

interface HeaderDefinition {
  key: string;
  label: string;
  hint: { cs: string; en: string };
}

const SECURITY_HEADERS: HeaderDefinition[] = [
  {
    key: 'x-content-type-options',
    label: 'X-Content-Type-Options',
    hint: {
      cs: 'zabrání hádání typu souboru prohlížečem (nosniff)',
      en: 'stops the browser from guessing file types (nosniff)',
    },
  },
  {
    key: 'content-security-policy',
    label: 'Content-Security-Policy',
    hint: {
      cs: 'omezí, odkud se smí načítat skripty a styly',
      en: 'restricts where scripts and styles may load from',
    },
  },
];

export function techChecks(ctx: AuditContext): CheckResult[] {
  const t = translator(ctx.locale);
  const { $, page, brokenLinks, faviconLive, locale } = ctx;
  const checks: CheckResult[] = [];

  /* --- Viewport --- */
  const viewport = ($('meta[name="viewport"]').attr('content') ?? '').trim();
  const hasDeviceWidth = /width\s*=\s*device-width/i.test(viewport);
  checks.push({
    id: 'viewport',
    label: t('Meta viewport (mobilní responzivita)', 'Meta viewport (mobile responsiveness)'),
    status: hasDeviceWidth ? 'pass' : viewport ? 'warn' : 'fail',
    value: viewport ? viewport.slice(0, 60) : t('chybí', 'missing'),
    weight: 3,
    detail: hasDeviceWidth
      ? t(
          'Meta viewport je nastavený s `width=device-width`, takže se stránka na mobilech správně přizpůsobí šířce displeje. Bez toho by mobilní prohlížeč stránku zmenšil jako desktopovou. Vlastní responzivitu layoutu si ověřte i vizuálně.',
          'The meta viewport is set with `width=device-width`, so the page adapts to the screen width on phones. Without it a mobile browser would shrink the page as if it were a desktop layout. Still check the layout itself visually.',
        )
      : viewport
        ? t(
            'Meta viewport na stránce je, ale neobsahuje `width=device-width`. Mobilní prohlížeč tak nemusí zvolit správnou šířku a stránka se může zobrazit zmenšená. Nastavte `<meta name="viewport" content="width=device-width, initial-scale=1">`.',
            'A meta viewport is present but it does not contain `width=device-width`. A mobile browser may pick the wrong width and render the page zoomed out. Set `<meta name="viewport" content="width=device-width, initial-scale=1">`.',
          )
        : t(
            'Stránka nemá meta viewport, takže se na mobilech vykreslí jako zmenšená desktopová verze a uživatel musí zoomovat. Google navíc mobilní použitelnost hodnotí jako faktor. Doplňte do hlavičky `<meta name="viewport" content="width=device-width, initial-scale=1">`.',
            'The page has no meta viewport, so phones render a shrunken desktop version and visitors have to pinch-zoom. Google also treats mobile usability as a ranking factor. Add `<meta name="viewport" content="width=device-width, initial-scale=1">` to the head.',
          ),
  });

  /* --- Favicon --- */
  const faviconTag = $('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').first();
  const hasFaviconTag = faviconTag.length > 0 && Boolean(faviconTag.attr('href'));
  if (hasFaviconTag) {
    checks.push({
      id: 'favicon',
      label: 'Favicon',
      status: 'pass',
      value: t('deklarován v HTML', 'declared in HTML'),
      weight: 1,
      detail: t(
        'Stránka deklaruje favicon přes tag `<link rel="icon">`. Ikona se zobrazí v záložce prohlížeče, v záložkách i ve výsledcích vyhledávání na mobilu. Doplňte ještě variantu ve formátu SVG a apple-touch-icon pro iOS.',
        'The page declares a favicon through `<link rel="icon">`. The icon shows up in the browser tab, in bookmarks and in mobile search results. Add an SVG variant and an apple-touch-icon for iOS as well.',
      ),
    });
  } else if (faviconLive === true) {
    checks.push({
      id: 'favicon',
      label: 'Favicon',
      status: 'warn',
      value: t('jen /favicon.ico', 'only /favicon.ico'),
      weight: 1,
      detail: t(
        'V HTML není tag pro favicon, ale soubor /favicon.ico na výchozí adrese existuje, takže prohlížeč ikonu najde. Spolehlivější je uvést ji explicitně přes `<link rel="icon">`. Přidejte i moderní SVG variantu a apple-touch-icon.',
        'There is no favicon tag in the HTML, but /favicon.ico exists at the default location, so browsers will find it. Declaring it explicitly with `<link rel="icon">` is more reliable. Add a modern SVG variant and an apple-touch-icon too.',
      ),
    });
  } else if (faviconLive === false) {
    checks.push({
      id: 'favicon',
      label: 'Favicon',
      status: 'fail',
      value: t('nenalezen', 'not found'),
      weight: 1,
      detail: t(
        'Web nemá favicon — chybí tag v HTML i soubor na /favicon.ico. Stránka pak vypadá v záložkách prohlížeče nedodělaně a hůř se pozná. Nahrajte ikonu a odkažte na ni tagem `<link rel="icon" href="/favicon.svg">`.',
        'The site has no favicon — neither a tag in the HTML nor a file at /favicon.ico. The page looks unfinished in browser tabs and is harder to recognise. Upload an icon and link it with `<link rel="icon" href="/favicon.svg">`.',
      ),
    });
  } else {
    checks.push({
      id: 'favicon',
      label: 'Favicon',
      status: 'unknown',
      value: t('nepodařilo se ověřit', 'could not verify'),
      weight: 1,
      detail: t(
        'V HTML není deklarovaný favicon a dostupnost /favicon.ico se nepodařilo ověřit, protože požadavek selhal. Zkontrolujte adresu ručně. Do skóre se tato kontrola nezapočítává.',
        'No favicon is declared in the HTML and /favicon.ico could not be checked because the request failed. Verify the address manually. This check does not count towards the score.',
      ),
    });
  }

  /* --- Bezpečnostní hlavičky (jen výpis, bez tvrdé penalizace) --- */
  const missing = SECURITY_HEADERS.filter((header) => !(header.key in page.headers));
  const present = SECURITY_HEADERS.filter((header) => header.key in page.headers);
  checks.push({
    id: 'security-headers',
    label: t('Bezpečnostní hlavičky', 'Security headers'),
    status: missing.length === 0 ? 'pass' : 'warn',
    value: t(
      `${present.length} z ${SECURITY_HEADERS.length} nastaveno`,
      `${present.length} of ${SECURITY_HEADERS.length} set`,
    ),
    // Váha 0: bezpečnostní hlavičky nejsou SEO téma. S váhou 0,5, která navíc
    // nikdy nemohla selhat, šlo o ozdobu s dopadem pod bod — informativní
    // řádek je poctivější než předstíraný vliv na skóre.
    weight: 0,
    detail:
      missing.length === 0
        ? t(
            'Server odesílá obě sledované doplňkové bezpečnostní hlavičky. Prohlížeč tak nehádá typy souborů a respektuje politiku obsahu. Obsah CSP si čas od času projděte, ať neobsahuje zbytečně široká pravidla.',
            'The server sends both tracked supplementary security headers. Browsers will not guess file types and will honour the content policy. Review the CSP occasionally so it does not drift into overly broad rules.',
          )
        : t(
            `Serveru chybí ${missing.length} z ${SECURITY_HEADERS.length} sledovaných doplňkových bezpečnostních hlaviček. Nejde o SEO problém, proto se do skóre nezapočítává, ale doplnění je většinou otázka pár řádků v konfiguraci serveru. Chybí: ${missing.map((header) => header.label).join(', ')}.`,
            `The server is missing ${missing.length} of the ${SECURITY_HEADERS.length} tracked supplementary security headers. This is not an SEO issue, so it does not count towards the score, but adding them is usually a few lines of server config. Missing: ${missing.map((header) => header.label).join(', ')}.`,
          ),
    meta: {
      kind: 'list',
      items: SECURITY_HEADERS.map(
        (header) =>
          `${header.key in page.headers ? '✓' : '✕'} ${header.label} — ${header.hint[locale]}`,
      ),
    },
  });

  /* --- HSTS (vynucení HTTPS) --- */
  const hsts = page.headers['strict-transport-security'] ?? '';
  const hstsMaxAgeMatch = /max-age\s*=\s*(\d+)/i.exec(hsts);
  const hstsMaxAge = hstsMaxAgeMatch ? Number(hstsMaxAgeMatch[1]) : null;
  // Půl roku je běžně doporučované minimum (Google/Chrome HSTS preload žádá rok).
  const HSTS_MIN_SECONDS = 15_552_000;
  const hstsLabel = t('HSTS (Strict-Transport-Security)', 'HSTS (Strict-Transport-Security)');
  if (!hsts) {
    checks.push({
      id: 'hsts',
      label: hstsLabel,
      status: 'fail',
      value: t('chybí', 'missing'),
      weight: 1,
      detail: t(
        'Server neodesílá hlavičku `Strict-Transport-Security`. Prohlížeč si tak nezapamatuje, že má na tuto doménu vždy chodit přes HTTPS, a při ručně zadaném http:// nebo starém odkazu jde první požadavek nešifrovaně, než ho přesměrování opraví. Nastavte `Strict-Transport-Security: max-age=31536000; includeSubDomains`.',
        'The server does not send a `Strict-Transport-Security` header. Browsers will not remember to always use HTTPS for this domain, so a manually typed http:// or an old link sends the first request unencrypted before a redirect fixes it. Set `Strict-Transport-Security: max-age=31536000; includeSubDomains`.',
      ),
    });
  } else if (hstsMaxAge === null || hstsMaxAge < HSTS_MIN_SECONDS) {
    checks.push({
      id: 'hsts',
      label: hstsLabel,
      status: 'warn',
      value: hstsMaxAge === null ? t('bez max-age', 'no max-age') : t(`max-age ${Math.round(hstsMaxAge / 86400)} dní`, `max-age ${Math.round(hstsMaxAge / 86400)} days`),
      weight: 1,
      detail: t(
        `Hlavička HSTS je nastavená, ale ${hstsMaxAge === null ? 'neobsahuje platnou hodnotu max-age' : `platí jen ${Math.round(hstsMaxAge / 86400)} dní, což je méně než doporučených 180`}. Krátká platnost znamená, že si prohlížeč vynucení HTTPS brzy „zapomene". Nastavte max-age alespoň na rok (31536000 vteřin), ideálně s includeSubDomains.`,
        `The HSTS header is set, but ${hstsMaxAge === null ? 'it has no valid max-age value' : `it is only valid for ${Math.round(hstsMaxAge / 86400)} days, less than the recommended 180`}. A short lifetime means the browser soon "forgets" to enforce HTTPS. Set max-age to at least a year (31536000 seconds), ideally with includeSubDomains.`,
      ),
    });
  } else {
    checks.push({
      id: 'hsts',
      label: hstsLabel,
      status: 'pass',
      value: t(`max-age ${Math.round(hstsMaxAge / 86400)} dní`, `max-age ${Math.round(hstsMaxAge / 86400)} days`),
      weight: 1,
      detail: t(
        `Hlavička HSTS je nastavená s dostatečnou platností (${Math.round(hstsMaxAge / 86400)} dní). Prohlížeč si zapamatuje, že tato doména se má vždy načítat přes HTTPS, a nedovolí ani ručně zadané http://. To chrání i před útoky typu SSL stripping.`,
        `The HSTS header is set with a sufficient lifetime (${Math.round(hstsMaxAge / 86400)} days). Browsers remember that this domain must always load over HTTPS, blocking even a manually typed http://. This also protects against SSL-stripping attacks.`,
      ),
    });
  }

  /* --- Komprese odpovědi --- */
  const contentEncoding = (page.headers['content-encoding'] ?? '').toLowerCase();
  const isCompressed = /\b(gzip|br|zstd)\b/.test(contentEncoding);
  checks.push({
    id: 'compression',
    label: t('Komprese odpovědi (gzip/brotli)', 'Response compression (gzip/brotli)'),
    status: isCompressed ? 'pass' : 'warn',
    value: isCompressed ? contentEncoding : t('bez komprese', 'uncompressed'),
    weight: 1,
    detail: isCompressed
      ? t(
          `Server posílá HTML komprimované (${contentEncoding}), takže přenos je výrazně menší a stránka se natáhne rychleji, zejména na mobilních sítích. Ověřte, že kompresi mají i CSS a JavaScript soubory, ne jen HTML.`,
          `The server sends the HTML compressed (${contentEncoding}), so the transfer is much smaller and the page loads faster, especially on mobile networks. Check that CSS and JavaScript files are compressed too, not just the HTML.`,
        )
      : t(
          'Odpověď serveru neobsahuje hlavičku `Content-Encoding` s gzip, brotli ani zstd — HTML se posílá nekomprimované. U textového obsahu jde typicky o úsporu 70–80 % velikosti přenosu prakticky zadarmo. Zapněte kompresi na webovém serveru nebo CDN (Brotli je efektivnější než gzip).',
          'The server response has no `Content-Encoding` header with gzip, brotli or zstd — the HTML is sent uncompressed. For text content this is typically a 70–80% reduction in transfer size for almost no cost. Enable compression on the web server or CDN (Brotli is more efficient than gzip).',
        ),
  });

  /* --- Cache-Control --- */
  const cacheControl = page.headers['cache-control'] ?? '';
  const hasCacheControl = cacheControl.trim().length > 0;
  checks.push({
    id: 'cache-control',
    label: 'Cache-Control',
    status: hasCacheControl ? 'pass' : 'warn',
    value: hasCacheControl ? cacheControl.slice(0, 60) : t('chybí', 'missing'),
    weight: 1,
    detail: hasCacheControl
      ? t(
          `Odpověď nese hlavičku Cache-Control (\`${cacheControl.slice(0, 80)}\`), takže prohlížeče a CDN vědí, jak dlouho smí obsah uchovat bez opětovného stažení. U HTML stránky s proměnlivým obsahem bývá v pořádku i krátká platnost nebo \`no-cache\` — hlavní je, že je nastavená vědomě.`,
          `The response carries a Cache-Control header (\`${cacheControl.slice(0, 80)}\`), so browsers and CDNs know how long they may keep the content without re-fetching. For an HTML page with changing content, even a short lifetime or \`no-cache\` is fine — what matters is that it is set deliberately.`,
        )
      : t(
          'Odpověď neobsahuje hlavičku Cache-Control. Prohlížeče a CDN pak musí hádat, jak dlouho obsah uchovat, a chování se může lišit mezi nimi. Nastavte ji explicitně — u HTML třeba `no-cache` nebo krátké `max-age`, u statických souborů dlouhé s `immutable`.',
          'The response has no Cache-Control header. Browsers and CDNs then have to guess how long to keep the content, and behaviour can differ between them. Set it explicitly — for HTML something like `no-cache` or a short `max-age`, for static assets a long one with `immutable`.',
        ),
  });

  /* --- Znaková sada (charset) --- */
  const contentTypeHeader = page.headers['content-type'] ?? '';
  const headerCharsetMatch = /charset\s*=\s*"?([\w-]+)"?/i.exec(contentTypeHeader);
  const metaCharsetMatch = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(page.html.slice(0, 1024));
  const metaHttpEquivMatch = /<meta[^>]+http-equiv=["']content-type["'][^>]*content=["'][^"']*charset=([\w-]+)/i.exec(
    page.html.slice(0, 1024),
  );
  const declaredCharset = (headerCharsetMatch?.[1] ?? metaCharsetMatch?.[1] ?? metaHttpEquivMatch?.[1] ?? '').toLowerCase();
  const isUtf8 = declaredCharset === 'utf-8' || declaredCharset === 'utf8';
  const charsetLabel = t('Znaková sada (charset)', 'Character encoding (charset)');
  if (!declaredCharset) {
    checks.push({
      id: 'charset',
      label: charsetLabel,
      status: 'fail',
      value: t('nedeklarovaná', 'not declared'),
      weight: 1,
      detail: t(
        'Stránka nedeklaruje znakovou sadu — chybí `charset` v hlavičce Content-Type i v `<meta charset>` v prvních 1024 bajtech HTML. Prohlížeč pak musí kódování odhadovat, což u češtiny snadno vede k rozsypaným diakritickým znakům. Doplňte `<meta charset="UTF-8">` jako první tag v `<head>`.',
        'The page does not declare a character encoding — no `charset` in the Content-Type header and no `<meta charset>` within the first 1024 bytes of HTML. Browsers then have to guess the encoding, which easily garbles accented characters. Add `<meta charset="UTF-8">` as the very first tag in `<head>`.',
      ),
    });
  } else if (!isUtf8) {
    checks.push({
      id: 'charset',
      label: charsetLabel,
      status: 'warn',
      value: declaredCharset,
      weight: 1,
      detail: t(
        `Stránka deklaruje znakovou sadu ${declaredCharset} místo doporučeného UTF-8. Starší kódování (např. windows-1250) umí zobrazit češtinu správně, ale komplikuje kopírování textu, vyhledávání a napojení na moderní nástroje, které počítají s UTF-8. Přejděte na \`<meta charset="UTF-8">\` a soubory ulož­te v UTF-8.`,
        `The page declares the ${declaredCharset} character encoding instead of the recommended UTF-8. Older encodings can display accented text correctly, but complicate copy-pasting, search and integration with modern tools that assume UTF-8. Switch to \`<meta charset="UTF-8">\` and save files as UTF-8.`,
      ),
    });
  } else {
    checks.push({
      id: 'charset',
      label: charsetLabel,
      status: 'pass',
      value: 'UTF-8',
      weight: 1,
      detail: t(
        'Stránka deklaruje UTF-8, univerzální znakovou sadu, která bez problémů zobrazí českou diakritiku i libovolný jiný jazyk. Ověřte jen, že je deklarace v prvních 1024 bajtech HTML — prohlížeč jinak stihne začít parsovat dřív, než na ni narazí.',
        'The page declares UTF-8, the universal character encoding that displays accented characters and any other language without issues. Just make sure the declaration sits within the first 1024 bytes of HTML — otherwise the browser may start parsing before it gets there.',
      ),
    });
  }

  /* --- Vlastní 404 stránka --- */
  const notFoundLabel = t('Vlastní 404 stránka', 'Custom 404 page');
  const { notFound } = ctx;
  if (!notFound.checked) {
    checks.push({
      id: 'custom-404',
      label: notFoundLabel,
      status: 'unknown',
      value: t('nepodařilo se ověřit', 'could not verify'),
      weight: 1,
      detail: t(
        'Kontrolu 404 stránky se nepodařilo provést, protože požadavek na neexistující adresu selhal. Ověřte chování webu ručně na libovolné smyšlené adrese. Do skóre se tato kontrola nezapočítává.',
        'The 404 page check could not run because the request to a non-existent address failed. Verify the behaviour manually on any made-up address. This check does not count towards the score.',
      ),
    });
  } else if (notFound.status !== 404) {
    checks.push({
      id: 'custom-404',
      label: notFoundLabel,
      status: notFound.redirectedToHome ? 'warn' : 'fail',
      value: notFound.redirectedToHome
        ? t('přesměrováno na hlavní stránku', 'redirects to the homepage')
        : t(`vrací HTTP ${notFound.status}`, `returns HTTP ${notFound.status}`),
      weight: 1,
      detail: notFound.redirectedToHome
        ? t(
            'Neexistující adresa se nepřesměrovanou 404 hlásí, ale místo toho přesměruje na hlavní stránku. Návštěvník tak neví, že překlep nebo starý odkaz nikam nevede, a vyhledávače mohou takové adresy začít indexovat jako duplicitní obsah hlavní stránky. Vraťte na neexistujících adresách skutečný stavový kód 404.',
            'A non-existent address does not report a 404 — instead it redirects to the homepage. Visitors have no way to tell that a typo or an old link leads nowhere, and search engines may start indexing such addresses as duplicate homepage content. Return a genuine 404 status code for non-existent addresses.',
          )
        : t(
            `Neexistující adresa vrací HTTP ${notFound.status} místo 404 — jde o takzvané „soft 404". Vyhledávače takovou stránku mohou začít indexovat, i když žádný obsah nenabízí, a plýtvají tak crawl budgetem na prázdné adresy. Nastavte, aby neexistující cesty vracely stavový kód 404 (nebo 410, pokud obsah trvale zmizel).`,
            `A non-existent address returns HTTP ${notFound.status} instead of 404 — a so-called "soft 404". Search engines may start indexing such a page even though it offers no content, wasting crawl budget on empty addresses. Make sure non-existent paths return a 404 status code (or 410 if the content is permanently gone).`,
          ),
    });
  } else {
    const hasExplanation = notFound.textLength >= 120;
    checks.push({
      id: 'custom-404',
      label: notFoundLabel,
      status: hasExplanation ? 'pass' : 'warn',
      value: hasExplanation ? t('404 s vysvětlením', '404 with an explanation') : t('holé 404', 'bare 404'),
      weight: 1,
      detail: hasExplanation
        ? t(
            'Neexistující adresa vrací správný stavový kód 404 a stránka obsahuje dost textu na to, aby návštěvníkovi vysvětlila, co se stalo, a nabídla cestu dál (odkaz na homepage, vyhledávání). Je to i signál pro vyhledávače, že adresa opravdu neexistuje.',
            'A non-existent address correctly returns a 404 status, and the page has enough text to explain to the visitor what happened and offer a way forward (a link to the homepage, search). It also signals to search engines that the address genuinely does not exist.',
          )
        : t(
            'Neexistující adresa vrací správný stavový kód 404, ale stránka je téměř prázdná — pravděpodobně jen výchozí hláška serveru. Vlastní 404 stránka s vysvětlením a odkazem na homepage nebo vyhledávání sníží okamžité opuštění webu po překlepu v adrese.',
            'A non-existent address correctly returns a 404 status, but the page is nearly empty — likely just the server default message. A custom 404 page with an explanation and a link to the homepage or search reduces immediate bounces after a mistyped address.',
          ),
    });
  }

  /* --- Rozbité interní odkazy --- */
  const brokenLabel = t('Rozbité interní odkazy', 'Broken internal links');
  if (brokenLinks.failed && brokenLinks.checked === 0) {
    checks.push({
      id: 'broken-links',
      label: brokenLabel,
      status: 'unknown',
      value: t('nepodařilo se ověřit', 'could not verify'),
      weight: 2,
      detail: t(
        'Kontrolu odkazů se nepodařilo provést, protože se žádný požadavek nedokončil. Ověřte odkazy ručně nebo audit spusťte znovu. Do skóre se tato kontrola nezapočítává.',
        'The link check could not run because no request completed. Verify the links manually or run the audit again. This check does not count towards the score.',
      ),
    });
  } else if (brokenLinks.checked === 0) {
    checks.push({
      id: 'broken-links',
      label: brokenLabel,
      status: 'warn',
      value: t('žádné interní odkazy', 'no internal links'),
      weight: 2,
      detail: t(
        'Ve staženém HTML nejsou žádné interní odkazy na stejnou doménu. U jednostránkových prezentací je to v pořádku, jinak to znamená, že se navigace vykresluje až JavaScriptem. Bez odkazů v HTML se roboti hůř dostanou na podstránky.',
        'The downloaded HTML contains no internal links to the same domain. That is fine for a one-page site; otherwise it means the navigation is rendered by JavaScript. Without links in the HTML, crawlers have a harder time reaching subpages.',
      ),
    });
  } else {
    const broken = brokenLinks.broken;
    // Podíl, ne absolutní počet: 3 rozbité z 15 a 15 z 15 je propastný rozdíl,
    // který dřív dostal shodně `fail`.
    const brokenRatio = (broken.length / brokenLinks.checked) * 100;
    const pct = formatPercent(brokenRatio, locale);
    checks.push({
      id: 'broken-links',
      label: brokenLabel,
      status: broken.length === 0 ? 'pass' : brokenRatio <= 20 ? 'warn' : 'fail',
      score: ramp(brokenRatio, BROKEN_LINK_ANCHORS),
      value: t(
        `${broken.length} z ${brokenLinks.checked} ověřených (${pct})`,
        `${broken.length} of ${brokenLinks.checked} checked (${pct})`,
      ),
      weight: 2,
      detail:
        broken.length === 0
          ? t(
              `Ověřili jsme ${brokenLinks.checked} interních odkazů z této stránky a všechny odpověděly v pořádku. Návštěvníci ani roboti tedy nenarazí na slepou uličku. Kontrolováno je maximálně 15 odkazů přímo z HTML, nejde o průchod celým webem.`,
              `We checked ${brokenLinks.checked} internal links from this page and every one responded correctly. Neither visitors nor crawlers will hit a dead end. At most 15 links straight from the HTML are checked — this is not a full site crawl.`,
            )
          : brokenRatio <= 20
            ? t(
                `Z ${brokenLinks.checked} ověřených odkazů ${broken.length} nefunguje (${pct}). Opravte cílové adresy nebo nastavte přesměrování na relevantní stránku. Rozbité odkazy zhoršují zážitek uživatele a plýtvají crawl budgetem.`,
                `Of ${brokenLinks.checked} links checked, ${broken.length} are broken (${pct}). Fix the target addresses or redirect them to a relevant page. Broken links hurt the visitor experience and waste crawl budget.`,
              )
            : t(
                `Nefunguje ${pct} ověřených odkazů (${broken.length} z ${brokenLinks.checked}), což je systémový problém — nejspíš v šabloně nebo v navigaci. Projděte uvedené adresy a opravte je nebo přesměrujte. Kontrolováno je maximálně 15 odkazů z této stránky, na celém webu jich může být víc.`,
                `${pct} of the checked links are broken (${broken.length} of ${brokenLinks.checked}), which points to a systemic problem — most likely in a template or in the navigation. Go through the listed addresses and fix or redirect them. At most 15 links from this page are checked; the whole site may have more.`,
              ),
      meta: broken.length > 0 ? { kind: 'links', items: broken } : undefined,
    });
  }

  return checks;
}
