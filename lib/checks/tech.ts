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
    key: 'strict-transport-security',
    label: 'Strict-Transport-Security',
    hint: {
      cs: 'vynutí HTTPS i při ručním zadání http://',
      en: 'forces HTTPS even when http:// is typed manually',
    },
  },
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
            'Všechny tři sledované bezpečnostní hlavičky server odesílá. Prohlížeč tak vynutí HTTPS, nehádá typy souborů a respektuje politiku obsahu. Obsah CSP si čas od času projděte, ať neobsahuje zbytečně široká pravidla.',
            'The server sends all three tracked security headers. Browsers will force HTTPS, stop guessing file types and honour the content policy. Review the CSP occasionally so it does not drift into overly broad rules.',
          )
        : t(
            `Serveru chybí ${missing.length} ze tří sledovaných bezpečnostních hlaviček. Nejde o SEO problém, proto se do skóre nezapočítává, ale doplnění je většinou otázka pár řádků v konfiguraci serveru. Chybí: ${missing.map((header) => header.label).join(', ')}.`,
            `The server is missing ${missing.length} of the three tracked security headers. This is not an SEO issue, so it does not count towards the score, but adding them is usually a few lines of server config. Missing: ${missing.map((header) => header.label).join(', ')}.`,
          ),
    meta: {
      kind: 'list',
      items: SECURITY_HEADERS.map(
        (header) =>
          `${header.key in page.headers ? '✓' : '✕'} ${header.label} — ${header.hint[locale]}`,
      ),
    },
  });

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
