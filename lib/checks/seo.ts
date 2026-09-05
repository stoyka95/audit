import { blocksEntireSite } from '../robots';
import { extractJsonLd } from '../jsonld';
import { formatPercent, pluralCz } from '../format';
import { translator } from '../i18n';
import { ramp, type RampAnchors } from '../scoring';
import type { AuditContext, CheckResult } from '../types';

/** Podíl obrázků bez atributu alt v procentech: 0 % je ideál, 20 % hranice fail. */
const ALT_ANCHORS: RampAnchors = { good: 0, poor: 20, zero: 100 };

export function seoChecks(ctx: AuditContext): CheckResult[] {
  const t = translator(ctx.locale);
  const { $, page, robots, robotsFailed, sitemap, sitemapFromRobots, targetUrl, locale } = ctx;
  const checks: CheckResult[] = [];

  const missingValue = t('chybí', 'missing');
  const unverifiedValue = t('nepodařilo se ověřit', 'could not verify');
  const chars = (count: number) =>
    t(
      `${count} ${pluralCz(count, 'znak', 'znaky', 'znaků')}`,
      `${count} ${count === 1 ? 'character' : 'characters'}`,
    );

  /* --- Title --- */
  const title = $('head title').first().text().trim();
  if (!title) {
    checks.push({
      id: 'title',
      label: t('Title tag', 'Title tag'),
      status: 'fail',
      value: missingValue,
      weight: 3,
      detail: t(
        'Stránka nemá titulek, což je nejsilnější on-page signál pro vyhledávače i to, co uživatel vidí ve výsledcích hledání. Doplňte do hlavičky `<title>` s klíčovým slovem a názvem značky, ideálně v délce 10–60 znaků. Bez titulku si Google vytvoří vlastní, obvykle horší.',
        'The page has no title — the strongest on-page signal for search engines and the first thing a user sees in the results. Add a `<title>` to the head containing the keyword and the brand name, ideally 10–60 characters long. Without one, Google writes its own, usually worse.',
      ),
    });
  } else {
    const length = title.length;
    const ok = length >= 10 && length <= 60;
    checks.push({
      id: 'title',
      label: t('Title tag', 'Title tag'),
      status: ok ? 'pass' : 'warn',
      value: chars(length),
      weight: 3,
      detail: ok
        ? t(
            `Titulek existuje a jeho délka je v doporučeném rozsahu 10–60 znaků. Ve výsledcích vyhledávání se zobrazí celý a nebude oříznutý. Aktuální znění: „${title}".`,
            `The title exists and its length sits in the recommended 10–60 character range, so it will show in full in the search results. Current wording: “${title}”.`,
          )
        : length < 10
          ? t(
              `Titulek je příliš krátký (${length} znaků) a nevyužívá prostor pro klíčová slova. Rozšiřte ho na 10–60 znaků tak, aby popisoval obsah stránky a obsahoval název značky. Aktuální znění: „${title}".`,
              `The title is too short (${length} characters) and wastes space that could carry keywords. Extend it to 10–60 characters so it describes the page and includes the brand name. Current wording: “${title}”.`,
            )
          : t(
              `Titulek je delší než 60 znaků, takže ho Google ve výsledcích pravděpodobně ořízne. Zkraťte ho a nejdůležitější klíčové slovo dejte na začátek. Aktuální znění: „${title}".`,
              `The title is longer than 60 characters, so Google will most likely truncate it. Shorten it and move the most important keyword to the front. Current wording: “${title}”.`,
            ),
    });
  }

  /* --- Meta description --- */
  const description = ($('head meta[name="description"]').attr('content') ?? '').trim();
  if (!description) {
    checks.push({
      id: 'meta-description',
      label: t('Meta description', 'Meta description'),
      status: 'fail',
      value: missingValue,
      weight: 2,
      detail: t(
        'Stránka nemá meta description, takže si Google do výsledků vybere náhodný úryvek textu. Doplňte popisek dlouhý 50–160 znaků, který shrne obsah a obsahuje výzvu k akci. Přímo na pozice nemá vliv, ale výrazně ovlivňuje míru prokliku.',
        'The page has no meta description, so Google picks an arbitrary snippet of text for the results. Add a 50–160 character description that summarises the page and includes a call to action. It does not affect rankings directly, but it strongly affects click-through rate.',
      ),
    });
  } else {
    const length = description.length;
    const ok = length >= 50 && length <= 160;
    checks.push({
      id: 'meta-description',
      label: t('Meta description', 'Meta description'),
      status: ok ? 'pass' : 'warn',
      value: chars(length),
      weight: 2,
      detail: ok
        ? t(
            'Popisek existuje a vejde se do doporučeného rozsahu 50–160 znaků. Ve výsledcích vyhledávání se zobrazí celý a plní roli reklamního textu. Kontrolujte, aby byl pro každou stránku unikátní.',
            'The description exists and fits the recommended 50–160 character range. It will show in full in the search results and does the job of ad copy. Make sure it is unique for every page.',
          )
        : length < 50
          ? t(
              `Popisek je příliš krátký (${length} znaků) a nevyužívá dostupný prostor ve výsledcích hledání. Rozšiřte ho na 50–160 znaků a přidejte konkrétní přínos pro návštěvníka. Krátký popisek Google často nahradí vlastním úryvkem.`,
              `The description is too short (${length} characters) and wastes the space available in the results. Extend it to 50–160 characters and state a concrete benefit for the visitor. Google often replaces short descriptions with its own snippet.`,
            )
          : t(
              'Popisek je delší než 160 znaků a bude ve výsledcích oříznutý. Zkraťte ho tak, aby nejdůležitější sdělení bylo v prvních 120 znacích. Zbytek uživatel stejně neuvidí.',
              'The description is longer than 160 characters and will be truncated in the results. Shorten it so the key message lands within the first 120 characters — the rest is never seen anyway.',
            ),
    });
  }

  /* --- H1 --- */
  const h1s = $('h1')
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);
  checks.push({
    id: 'h1',
    label: t('Nadpis H1', 'H1 heading'),
    status: h1s.length === 1 ? 'pass' : h1s.length === 0 ? 'fail' : 'warn',
    value: `${h1s.length}×`,
    weight: 3,
    detail:
      h1s.length === 1
        ? t(
            `Stránka má právě jeden nadpis H1, což je správně. Vyhledávače i čtečky obrazovky z něj poznají hlavní téma stránky. Aktuální znění: „${h1s[0].slice(0, 120)}".`,
            `The page has exactly one H1, which is correct. Search engines and screen readers use it to identify the main topic. Current wording: “${h1s[0].slice(0, 120)}”.`,
          )
        : h1s.length === 0
          ? t(
              'Stránka nemá žádný nadpis H1, takže chybí jasné označení hlavního tématu. Doplňte jeden `<h1>` s hlavním klíčovým slovem — obvykle jde o vizuálně největší nadpis v obsahu. Vizuální velikost řešte pomocí CSS, ne volbou jiné úrovně nadpisu.',
              'The page has no H1, so the main topic is not clearly marked. Add a single `<h1>` with the main keyword — usually the visually largest heading in the content. Control the visual size with CSS, not by picking a different heading level.',
            )
          : t(
              `Stránka obsahuje ${h1s.length} nadpisů H1, což rozmělňuje hlavní téma. Ponechte jediný H1 pro hlavní název stránky a ostatní převeďte na H2. Pokud jde o vizuální efekt, upravte místo toho velikost písma v CSS.`,
              `The page contains ${h1s.length} H1 headings, which dilutes the main topic. Keep one H1 for the page title and convert the rest to H2. If it was for visual effect, change the font size in CSS instead.`,
            ),
  });

  /* --- Hierarchie nadpisů --- */
  const headingLevels = $('h1, h2, h3, h4, h5, h6')
    .map((_, element) => Number((element as { tagName?: string }).tagName?.replace(/\D/g, '') ?? 0))
    .get()
    .filter((level) => level > 0);

  const skips: string[] = [];
  for (let i = 1; i < headingLevels.length; i += 1) {
    const previous = headingLevels[i - 1];
    const current = headingLevels[i];
    if (current > previous + 1) skips.push(`H${previous} → H${current}`);
  }
  const hierarchyLabel = t('Hierarchie nadpisů', 'Heading hierarchy');

  if (headingLevels.length === 0) {
    checks.push({
      id: 'heading-hierarchy',
      label: hierarchyLabel,
      status: 'fail',
      value: t('žádné nadpisy', 'no headings'),
      weight: 1,
      detail: t(
        'Ve staženém HTML nejsou žádné nadpisy, takže obsah nemá strukturu. Rozdělte text na sekce pomocí H1 až H3 podle logické hierarchie. Bez nadpisů se v obsahu hůř orientují vyhledávače i čtečky obrazovky.',
        'The downloaded HTML has no headings at all, so the content has no structure. Split the text into sections using H1 to H3 in a logical hierarchy. Without headings, both search engines and screen readers struggle to navigate the content.',
      ),
    });
  } else {
    checks.push({
      id: 'heading-hierarchy',
      label: hierarchyLabel,
      status: skips.length === 0 ? 'pass' : 'warn',
      value:
        skips.length === 0
          ? t(`${headingLevels.length} nadpisů, bez skoků`, `${headingLevels.length} headings, no skips`)
          : t(
              `${skips.length} ${pluralCz(skips.length, 'skok', 'skoky', 'skoků')}`,
              `${skips.length} ${skips.length === 1 ? 'skip' : 'skips'}`,
            ),
      weight: 1,
      detail:
        skips.length === 0
          ? t(
              'Nadpisy tvoří logickou posloupnost bez přeskakování úrovní. Obsahová osnova je díky tomu srozumitelná pro vyhledávače i asistivní technologie. Tuto strukturu udržujte i u nově přidávaných sekcí.',
              'The headings form a logical sequence with no skipped levels, so the content outline is legible to search engines and assistive technology alike. Keep that structure as you add new sections.',
            )
          : t(
              `Nadpisy přeskakují úrovně (${skips.slice(0, 3).join(', ')}${skips.length > 3 ? ' a další' : ''}), takže osnova stránky není konzistentní. Používejte úrovně postupně — po H2 následuje H3, nikoli H4. Velikost písma řešte v CSS, ne volbou vyšší úrovně nadpisu.`,
              `The headings skip levels (${skips.slice(0, 3).join(', ')}${skips.length > 3 ? ' and more' : ''}), so the page outline is inconsistent. Step through the levels in order — H2 is followed by H3, not H4. Set font size in CSS rather than by choosing a deeper heading level.`,
            ),
      meta: skips.length > 0 ? { kind: 'list', items: skips.slice(0, 8) } : undefined,
    });
  }

  /* --- Canonical --- */
  const canonical = ($('link[rel="canonical"]').first().attr('href') ?? '').trim();
  const canonicalLabel = t('Canonical tag', 'Canonical tag');
  if (!canonical) {
    checks.push({
      id: 'canonical',
      label: canonicalLabel,
      status: 'fail',
      value: missingValue,
      weight: 2,
      detail: t(
        'Stránka neurčuje kanonickou URL, takže při existenci variant adresy (s parametry, s www i bez) hrozí duplicita obsahu. Doplňte do hlavičky `<link rel="canonical" href="…">` s absolutní adresou preferované verze. Je to levná pojistka proti tříštění signálů mezi duplicitní URL.',
        'The page does not declare a canonical URL, so if address variants exist (with parameters, with and without www) you risk duplicate content. Add `<link rel="canonical" href="…">` to the head with the absolute address of the preferred version. It is cheap insurance against splitting signals across duplicate URLs.',
      ),
    });
  } else {
    const isAbsolute = /^https?:\/\//i.test(canonical);
    checks.push({
      id: 'canonical',
      label: canonicalLabel,
      status: isAbsolute ? 'pass' : 'warn',
      value: isAbsolute ? t('absolutní URL', 'absolute URL') : t('relativní URL', 'relative URL'),
      weight: 2,
      detail: isAbsolute
        ? t(
            `Kanonická URL je nastavená a je uvedená v absolutním tvaru, jak Google doporučuje. Varianty adresy se tak slijí do jedné a nedochází k duplicitě. Nastavená hodnota: ${canonical}.`,
            `The canonical URL is set and given in absolute form, as Google recommends. Address variants collapse into one and no duplication occurs. Current value: ${canonical}.`,
          )
        : t(
            `Kanonická URL je sice nastavená, ale relativně (${canonical}). Google sice relativní tvar zvládne, oficiálně ale doporučuje absolutní adresu včetně protokolu a domény. Přepište hodnotu na plnou URL.`,
            `The canonical URL is set, but relatively (${canonical}). Google copes with the relative form, yet officially recommends an absolute address including protocol and domain. Rewrite the value as a full URL.`,
          ),
    });
  }

  /* --- Vícenásobný canonical --- */
  const canonicalCount = $('link[rel="canonical"]').length;
  checks.push({
    id: 'canonical-multiple',
    label: t('Počet canonical tagů', 'Number of canonical tags'),
    status: canonicalCount <= 1 ? 'pass' : 'fail',
    value:
      canonicalCount <= 1
        ? canonicalCount === 1
          ? t('jeden tag', 'one tag')
          : t('žádný tag', 'no tag')
        : t(`${canonicalCount}×`, `${canonicalCount}×`),
    weight: 2,
    detail:
      canonicalCount <= 1
        ? t(
            'Stránka má nejvýš jeden tag `<link rel="canonical">`, takže signál není protichůdný. Google podle specifikace bere v úvahu jen jeden canonical na stránku.',
            'The page has at most one `<link rel="canonical">` tag, so the signal is not contradictory. Google only honours a single canonical per page by specification.',
          )
        : t(
            `Stránka obsahuje ${canonicalCount} tagů \`<link rel="canonical">\` místo jednoho — nejčastěji jeden z pluginu a jeden ručně v šabloně. Google si v takovém případě sám vybere, který použije, a nemusí to být ten zamýšlený. Ponechte v \`<head>\` jen jeden canonical tag.`,
            `The page contains ${canonicalCount} \`<link rel="canonical">\` tags instead of one — usually one from a plugin and one hardcoded in the template. In that case Google picks whichever it likes, which may not be the intended one. Keep only one canonical tag in \`<head>\`.`,
          ),
  });

  /* --- Trackovací parametry v canonical --- */
  const TRACKING_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
    'msclkid',
    'ref',
    'session_id',
    'sessionid',
    'phpsessid',
  ];
  let canonicalTrackingParams: string[] = [];
  if (canonical) {
    try {
      const canonicalUrl = new URL(canonical, page.finalUrl);
      canonicalTrackingParams = TRACKING_PARAMS.filter((param) => canonicalUrl.searchParams.has(param));
    } catch {
      // Neplatnou canonical URL už hlásí kontrola výše, tady ji jen tiše přeskočíme.
    }
  }
  checks.push({
    id: 'canonical-params',
    label: t('Trackovací parametry v canonical', 'Tracking parameters in canonical'),
    status: canonicalTrackingParams.length === 0 ? 'pass' : 'warn',
    value: canonicalTrackingParams.length === 0 ? t('čistá URL', 'clean URL') : canonicalTrackingParams.join(', '),
    weight: 1,
    detail:
      canonicalTrackingParams.length === 0
        ? t(
            'Kanonická URL neobsahuje žádný z běžných trackovacích parametrů (utm_, gclid, fbclid…). Varianty stejné stránky sdílené s různými kampaněmi se tak správně slijí do jedné indexované adresy.',
            'The canonical URL contains none of the common tracking parameters (utm_, gclid, fbclid…). Variants of the same page shared with different campaigns correctly collapse into one indexed address.',
          )
        : t(
            `Kanonická URL obsahuje trackovací parametry (${canonicalTrackingParams.join(', ')}), které by v ní neměly být. Canonical má ukazovat na čistou adresu bez parametrů kampaně — jinak různé kampaně na stejný obsah nemusí Google slít do jedné stránky. Odstraňte tyto parametry z hodnoty canonical.`,
            `The canonical URL contains tracking parameters (${canonicalTrackingParams.join(', ')}) that should not be there. The canonical should point at a clean address without campaign parameters — otherwise Google may not collapse different campaigns for the same content into a single page. Remove these parameters from the canonical value.`,
          ),
  });

  /* --- Indexovatelnost (meta robots / X-Robots-Tag) --- */
  const directiveSources: { where: string; value: string }[] = [];
  $('meta[name]').each((_, element) => {
    const name = ($(element).attr('name') ?? '').trim().toLowerCase();
    if (name !== 'robots' && name !== 'googlebot') return;
    const content = ($(element).attr('content') ?? '').trim();
    if (content) directiveSources.push({ where: `<meta name="${name}">`, value: content });
  });
  const headerDirective = page.headers['x-robots-tag'];
  if (headerDirective) directiveSources.push({ where: 'X-Robots-Tag', value: headerDirective });

  const directives = directiveSources.flatMap((source) =>
    source.value
      .toLowerCase()
      .split(',')
      .map((part) => part.trim())
      // Tvar „googlebot: noindex" v hlavičce nese direktivu až za dvojtečkou.
      .map((part) => (part.includes(':') ? part.slice(part.lastIndexOf(':') + 1).trim() : part))
      .filter(Boolean),
  );
  const noindex = directives.some((directive) => directive === 'noindex' || directive === 'none');
  const nofollow = directives.some((directive) => directive === 'nofollow' || directive === 'none');
  const sourceLabels = directiveSources.map((source) => `${source.where} → ${source.value}`);

  checks.push({
    id: 'indexability',
    label: t('Indexovatelnost stránky', 'Page indexability'),
    status: noindex ? 'fail' : nofollow ? 'warn' : 'pass',
    value: noindex ? 'noindex' : nofollow ? 'nofollow' : t('indexovatelná', 'indexable'),
    weight: 3,
    blocker: t(
      'Stránka má direktivu `noindex`, takže ji vyhledávače vyřadí z indexu i kdyby bylo vše ostatní v pořádku.',
      'The page carries a `noindex` directive, so search engines will drop it from the index even if everything else is perfect.',
    ),
    detail: noindex
      ? t(
          'Stránka má direktivu `noindex`, takže se do vyhledávání nedostane — vyhledávač ji smí projít, ale nesmí ji zařadit do indexu. Pokud to není záměr (typicky u testovacího prostředí nebo omylem zapnutého přepínače v CMS), direktivu odstraňte. Dokud tam je, nemá smysl řešit žádnou jinou SEO optimalizaci této stránky.',
          'The page carries a `noindex` directive, so it will not appear in search — crawlers may read it but must not index it. Unless that is intentional (typically a staging environment or a toggle accidentally left on in the CMS), remove the directive. While it is there, no other SEO work on this page matters.',
        )
      : nofollow
        ? t(
            'Stránka je indexovatelná, ale má direktivu `nofollow` — vyhledávač po odkazech z ní nepůjde dál a nepředá jim žádnou váhu. Na běžné obsahové stránce to bývá omyl. Ponechte ji jen tam, kde odkazy vědomě nechcete podporovat.',
            'The page is indexable but carries a `nofollow` directive — crawlers will not follow its links and will pass them no weight. On an ordinary content page that is usually a mistake. Keep it only where you deliberately do not want to endorse the links.',
          )
        : t(
            'Stránka neobsahuje žádnou direktivu, která by bránila indexaci — ani v meta tagu, ani v hlavičce `X-Robots-Tag`. Vyhledávače ji tedy smí zařadit do výsledků. Po nasazení nového webu si to ověřte znovu, přepnutí z testovacího režimu se často zapomíná.',
            'The page carries no directive that would block indexing — neither in a meta tag nor in the `X-Robots-Tag` header, so search engines may include it in the results. Re-check this after launching a new site; switching out of staging mode is easy to forget.',
          ),
    meta: sourceLabels.length > 0 ? { kind: 'list', items: sourceLabels } : undefined,
  });

  /* --- Konflikt canonical + noindex --- */
  const hasCanonicalNoindexConflict = Boolean(canonical) && noindex;
  checks.push({
    id: 'canonical-noindex-conflict',
    label: t('Konflikt canonical a noindex', 'Canonical vs. noindex conflict'),
    status: hasCanonicalNoindexConflict ? 'warn' : 'pass',
    value: hasCanonicalNoindexConflict ? t('protichůdné signály', 'conflicting signals') : t('bez konfliktu', 'no conflict'),
    weight: 1,
    detail: hasCanonicalNoindexConflict
      ? t(
          'Stránka má zároveň `noindex` a canonical tag. Signály si odporují: `noindex` říká „nezařazuj mě", canonical říká „tohle je ta správná verze, zařaď ji". Google se v takovém případě obvykle řídí `noindex` a canonical ignoruje, jiné vyhledávače na to ale mohou reagovat jinak. Pokud má být stránka mimo index, canonical nemusí být vůbec potřeba; pokud má být indexovaná, odstraňte `noindex`.',
          'The page carries both `noindex` and a canonical tag. The signals contradict each other: `noindex` says "do not index me", the canonical says "this is the correct version, index it". Google usually follows `noindex` and ignores the canonical in that case, but other software may behave differently. If the page should stay out of the index, the canonical is probably unnecessary; if it should be indexed, remove `noindex`.',
        )
      : t(
          'Stránka nemá zároveň `noindex` a canonical, takže si tyto dva signály neodporují.',
          'The page does not carry both `noindex` and a canonical at the same time, so these two signals do not contradict each other.',
        ),
  });

  /* --- robots.txt --- */
  if (robotsFailed) {
    checks.push({
      id: 'robots-txt',
      label: 'robots.txt',
      status: 'unknown',
      value: unverifiedValue,
      weight: 3,
      detail: t(
        'Soubor robots.txt se nepodařilo stáhnout — server neodpověděl nebo vypršel časový limit. Ověřte ručně, že je na adrese /robots.txt dostupný. Do skóre se tato kontrola nezapočítává.',
        'The robots.txt file could not be downloaded — the server did not respond or the request timed out. Check manually that /robots.txt is reachable. This check does not count towards the score.',
      ),
    });
  } else if (!robots.exists) {
    checks.push({
      id: 'robots-txt',
      label: 'robots.txt',
      status: 'warn',
      value: t('nenalezen', 'not found'),
      weight: 3,
      detail: t(
        'Na adrese /robots.txt není žádný soubor. Roboti sice budou web procházet celý, ale přicházíte o možnost řídit crawl budget, blokovat nesmyslné parametry a odkázat na sitemapu. Doplňte základní robots.txt s řádkem `Sitemap:`.',
        'There is no file at /robots.txt. Crawlers will happily read the whole site, but you lose the ability to steer crawl budget, block pointless parameters and point at the sitemap. Add a basic robots.txt with a `Sitemap:` line.',
      ),
    });
  } else if (blocksEntireSite(robots)) {
    checks.push({
      id: 'robots-txt',
      label: 'robots.txt',
      status: 'fail',
      value: t('Disallow: / pro všechny', 'Disallow: / for everyone'),
      weight: 3,
      blocker: t(
        'robots.txt zakazuje procházení celého webu všem robotům, takže se web nemůže dostat do vyhledávání.',
        'robots.txt forbids every crawler from reading the whole site, so it cannot appear in search at all.',
      ),
      detail: t(
        'Soubor robots.txt zakazuje procházení celého webu všem robotům (`User-agent: *` s `Disallow: /`). To je nejzávažnější nález celého auditu — web se nemůže dostat do vyhledávání. Odstraňte toto pravidlo, pokud nejde o záměrně skrytý testovací web.',
        'The robots.txt file forbids every crawler from reading the whole site (`User-agent: *` with `Disallow: /`). This is the most serious finding in the whole audit — the site cannot reach search results. Remove the rule unless this is a deliberately hidden staging site.',
      ),
    });
  } else {
    checks.push({
      id: 'robots-txt',
      label: 'robots.txt',
      status: 'pass',
      value: t(
        `${robots.groups.length} ${pluralCz(robots.groups.length, 'skupina pravidel', 'skupiny pravidel', 'skupin pravidel')}`,
        `${robots.groups.length} rule ${robots.groups.length === 1 ? 'group' : 'groups'}`,
      ),
      weight: 3,
      detail: t(
        'Soubor robots.txt existuje a neblokuje celý web. Roboti se tak dostanou k obsahu, který má být indexovaný. Při každé změně pravidel si výsledek ověřte v testeru robots.txt v Search Console.',
        'The robots.txt file exists and does not block the whole site, so crawlers can reach the content meant to be indexed. Verify the result in the Search Console robots.txt tester whenever you change the rules.',
      ),
    });
  }

  /* --- robots.txt: blokace CSS/JS --- */
  const ASSET_BLOCK_PATTERNS = [/\.css(\?|$)/i, /\.js(\?|$)/i, /\/wp-content\//i, /\/wp-includes\//i, /\/_next\//i];
  const blockedAssetRules = new Set<string>();
  for (const group of robots.groups) {
    for (const rule of group.disallow) {
      if (rule && ASSET_BLOCK_PATTERNS.some((pattern) => pattern.test(rule))) blockedAssetRules.add(rule);
    }
  }
  const assetBlockLabel = t('Blokace CSS/JS v robots.txt', 'CSS/JS blocking in robots.txt');
  if (robotsFailed) {
    checks.push({
      id: 'robots-blocks-assets',
      label: assetBlockLabel,
      status: 'unknown',
      value: unverifiedValue,
      weight: 1,
      detail: t(
        'Soubor robots.txt se nepodařilo stáhnout, takže nelze ověřit, jestli neblokuje CSS nebo JavaScript. Do skóre se tato kontrola nezapočítává.',
        'The robots.txt file could not be downloaded, so it is impossible to verify whether it blocks CSS or JavaScript. This check does not count towards the score.',
      ),
    });
  } else {
    checks.push({
      id: 'robots-blocks-assets',
      label: assetBlockLabel,
      status: blockedAssetRules.size === 0 ? 'pass' : 'fail',
      value: blockedAssetRules.size === 0 ? t('neblokuje', 'not blocked') : [...blockedAssetRules].slice(0, 3).join(', '),
      weight: 1,
      detail:
        blockedAssetRules.size === 0
          ? t(
              'robots.txt neblokuje styly ani skripty. Google si tak může stránku vykreslit celou, přesně jak ji vidí návštěvník, a správně posoudit i mobilní použitelnost.',
              'robots.txt does not block styles or scripts, so Google can render the page in full, exactly as a visitor sees it, and correctly judge mobile usability too.',
            )
          : t(
              `robots.txt blokuje pravidly (${[...blockedAssetRules].join(', ')}) přístup ke stylům nebo skriptům. Googlebot pak stránku nevidí tak, jak ji vidí návštěvník, a může chybně vyhodnotit rozvržení nebo mobilní použitelnost jako horší, než ve skutečnosti je. Odstraňte tato pravidla nebo je zúžete jen na skutečně citlivé cesty.`,
              `robots.txt blocks access to styles or scripts with these rules (${[...blockedAssetRules].join(', ')}). Googlebot then does not see the page the way a visitor does and may misjudge the layout or mobile usability as worse than it actually is. Remove these rules or narrow them to genuinely sensitive paths only.`,
            ),
    });
  }

  /* --- robots.txt: Crawl-delay --- */
  const crawlDelayMatch = /crawl-delay\s*:\s*([\d.]+)/i.exec(robots.raw);
  const crawlDelay = crawlDelayMatch ? Number(crawlDelayMatch[1]) : null;
  const crawlDelayLabel = t('Crawl-delay v robots.txt', 'Crawl-delay in robots.txt');
  if (robotsFailed) {
    checks.push({
      id: 'robots-crawl-delay',
      label: crawlDelayLabel,
      status: 'unknown',
      value: unverifiedValue,
      weight: 1,
      detail: t(
        'Soubor robots.txt se nepodařilo stáhnout, takže nelze ověřit direktivu Crawl-delay. Do skóre se tato kontrola nezapočítává.',
        'The robots.txt file could not be downloaded, so the Crawl-delay directive could not be checked. This check does not count towards the score.',
      ),
    });
  } else if (crawlDelay === null) {
    checks.push({
      id: 'robots-crawl-delay',
      label: crawlDelayLabel,
      status: 'pass',
      value: t('nenastaveno', 'not set'),
      weight: 1,
      detail: t(
        'robots.txt neobsahuje direktivu Crawl-delay, takže roboti, kteří ji respektují (Google ji ignoruje, Bing a Seznam ano), procházejí web bez umělého zpomalení.',
        'robots.txt has no Crawl-delay directive, so crawlers that honour it (Google ignores it, Bing and other engines do not) crawl the site without an artificial slowdown.',
      ),
    });
  } else {
    checks.push({
      id: 'robots-crawl-delay',
      label: crawlDelayLabel,
      status: crawlDelay > 10 ? 'warn' : 'pass',
      value: t(`${crawlDelay} s`, `${crawlDelay} s`),
      weight: 1,
      detail:
        crawlDelay > 10
          ? t(
              `Direktiva Crawl-delay je nastavená na ${crawlDelay} vteřin, což je hodně — při stovkách stránek by procházení celého webu trvalo hodiny až dny. Google ji ignoruje, ale Bing a další roboti se jí řídí a s tak vysokou hodnotou objevují nový obsah pomalu. Snižte hodnotu, nebo ji úplně odstraňte a rychlost procházení řešte přes Search Console.`,
              `The Crawl-delay directive is set to ${crawlDelay} seconds, which is high — with hundreds of pages, crawling the whole site would take hours or days. Google ignores it, but Bing and other crawlers honour it and will discover new content slowly at such a high value. Lower it, or remove it entirely and manage crawl rate through Search Console instead.`,
            )
          : t(
              `Direktiva Crawl-delay je nastavená na ${crawlDelay} vteřin, což je rozumná hodnota, která výrazně nezpomalí objevování nového obsahu.`,
              `The Crawl-delay directive is set to ${crawlDelay} seconds, a reasonable value that will not meaningfully slow down discovery of new content.`,
            ),
    });
  }

  /* --- Sitemap --- */
  const sitemapLabel = t('XML sitemapa', 'XML sitemap');
  const sitemapLooksValid = sitemap.exists && /<(urlset|sitemapindex)/i.test(sitemap.text);
  if (sitemap.failed && !sitemapFromRobots) {
    checks.push({
      id: 'sitemap',
      label: sitemapLabel,
      status: 'unknown',
      value: unverifiedValue,
      weight: 2,
      detail: t(
        'Sitemapu se nepodařilo ověřit, protože požadavek na /sitemap.xml selhal. Zkontrolujte ji ručně a případně doplňte odkaz do robots.txt. Do skóre se tato kontrola nezapočítává.',
        'The sitemap could not be verified because the request to /sitemap.xml failed. Check it manually and add a reference in robots.txt if needed. This check does not count towards the score.',
      ),
    });
  } else if (sitemapFromRobots || sitemapLooksValid) {
    checks.push({
      id: 'sitemap',
      label: sitemapLabel,
      status: 'pass',
      value: sitemapFromRobots
        ? t('odkaz v robots.txt', 'referenced in robots.txt')
        : t('na /sitemap.xml', 'at /sitemap.xml'),
      weight: 2,
      detail: sitemapFromRobots
        ? t(
            `Sitemapa je uvedená v robots.txt (${sitemapFromRobots}), takže ji roboti najdou automaticky. Urychluje to objevování nových a změněných stránek. Hlídejte, aby v ní byly jen indexovatelné URL vracející kód 200.`,
            `The sitemap is declared in robots.txt (${sitemapFromRobots}), so crawlers find it automatically, which speeds up discovery of new and changed pages. Make sure it only lists indexable URLs that return a 200.`,
          )
        : t(
            'Sitemapa je dostupná na standardní adrese /sitemap.xml a má platnou XML strukturu. Roboti tak snadno objeví všechny důležité stránky. Doplňte na ni ještě odkaz do robots.txt řádkem `Sitemap:`.',
            'The sitemap is available at the standard /sitemap.xml address and has a valid XML structure, so crawlers discover all the important pages easily. Also reference it from robots.txt with a `Sitemap:` line.',
          ),
    });
  } else if (sitemap.exists) {
    checks.push({
      id: 'sitemap',
      label: sitemapLabel,
      status: 'warn',
      value: t('neplatný obsah', 'invalid content'),
      weight: 2,
      detail: t(
        'Na adrese /sitemap.xml sice něco je, ale neobsahuje to očekávaný element `<urlset>` ani `<sitemapindex>` — pravděpodobně jde o HTML chybovou stránku. Vygenerujte platnou XML sitemapu a odkažte na ni z robots.txt. Neplatnou sitemapu Google ignoruje.',
        'Something exists at /sitemap.xml, but it contains neither the expected `<urlset>` nor `<sitemapindex>` element — most likely an HTML error page. Generate a valid XML sitemap and reference it from robots.txt. Google ignores an invalid sitemap.',
      ),
    });
  } else {
    checks.push({
      id: 'sitemap',
      label: sitemapLabel,
      status: 'fail',
      value: t('nenalezena', 'not found'),
      weight: 2,
      detail: t(
        'Nenašli jsme XML sitemapu ani na /sitemap.xml, ani odkazem v robots.txt. Bez ní musí roboti objevovat stránky jen procházením odkazů, což zdržuje indexaci nového obsahu. Vygenerujte sitemapu a přidejte ji do robots.txt i do Search Console.',
        'We found no XML sitemap, neither at /sitemap.xml nor referenced from robots.txt. Without one, crawlers have to discover pages by following links, which delays indexing of new content. Generate a sitemap and add it to robots.txt and to Search Console.',
      ),
    });
  }

  /* --- Sitemapa do hloubky: obsah --- */
  // Analýza dává smysl jen tehdy, když se podařilo stáhnout platné XML — jinak
  // by šlo o zdvojení nálezu, který už hlásí kontrola výše.
  if (sitemapLooksValid) {
    const isSitemapIndex = /<sitemapindex/i.test(sitemap.text);
    const locMatches = [...sitemap.text.matchAll(/<loc>\s*([^<\s][^<]*?)\s*<\/loc>/gi)].map((m) => m[1].trim());
    const totalLocs = locMatches.length;
    const nonAbsolute = locMatches.filter((loc) => !/^https?:\/\//i.test(loc)).length;
    // fetchText ořízne text na 200 000 znaků — blízko limitu čísla nevěřit doslova.
    const looksTruncated = sitemap.text.length >= 199_000;
    const entryLabel = isSitemapIndex
      ? t('dílčích sitemap', 'sub-sitemaps')
      : t('URL adres', 'URLs');
    const urlsLabel = t('Obsah sitemapy (počet a formát adres)', 'Sitemap content (URL count and format)');

    if (totalLocs === 0) {
      checks.push({
        id: 'sitemap-urls',
        label: urlsLabel,
        status: 'warn',
        value: t('žádné položky <loc>', 'no <loc> entries'),
        weight: 1,
        detail: t(
          'Sitemapa má platnou XML strukturu, ale neobsahuje žádnou položku `<loc>`. Prázdná sitemapa robotům nepomůže nic objevit. Zkontrolujte generátor sitemapy.',
          'The sitemap has valid XML structure but contains no `<loc>` entries. An empty sitemap does not help crawlers discover anything. Check the sitemap generator.',
        ),
      });
    } else if (nonAbsolute > 0) {
      checks.push({
        id: 'sitemap-urls',
        label: urlsLabel,
        status: 'fail',
        value: t(`${nonAbsolute} z ${totalLocs} relativních`, `${nonAbsolute} of ${totalLocs} relative`),
        weight: 1,
        detail: t(
          `${nonAbsolute} položek \`<loc>\` v sitemapě obsahuje relativní adresu místo absolutní URL s protokolem a doménou. Specifikace sitemap.org relativní adresy nepovoluje a roboti je mohou ignorovat. Opravte generátor, aby vypisoval plné adresy (https://…).`,
          `${nonAbsolute} \`<loc>\` entries in the sitemap contain a relative address instead of an absolute URL with protocol and domain. The sitemaps.org specification does not allow relative addresses, and crawlers may ignore them. Fix the generator to output full addresses (https://…).`,
        ),
      });
    } else if (totalLocs > 50_000 && !looksTruncated) {
      checks.push({
        id: 'sitemap-urls',
        label: urlsLabel,
        status: 'fail',
        value: t(`${totalLocs} ${entryLabel}`, `${totalLocs} ${entryLabel}`),
        weight: 1,
        detail: t(
          `Sitemapa obsahuje ${totalLocs} položek, což překračuje limit specifikace 50 000 na jeden soubor. Vyhledávače soubor nad limitem odmítnou celý. Rozdělte ho na víc sitemap a odkažte na ně přes sitemap index.`,
          `The sitemap contains ${totalLocs} entries, exceeding the specification's 50,000-per-file limit. Search engines reject a file over the limit entirely. Split it into multiple sitemaps and reference them through a sitemap index.`,
        ),
      });
    } else {
      checks.push({
        id: 'sitemap-urls',
        label: urlsLabel,
        status: 'pass',
        value: looksTruncated
          ? t(`alespoň ${totalLocs} ${entryLabel}`, `at least ${totalLocs} ${entryLabel}`)
          : t(`${totalLocs} ${entryLabel}`, `${totalLocs} ${entryLabel}`),
        weight: 1,
        detail: looksTruncated
          ? t(
              `Sitemapa obsahuje přinejmenším ${totalLocs} položek s absolutními URL — soubor je ale větší, než kolik audit stahuje pro kontrolu (200 kB), takže přesný počet a limit 50 000 položek jsme neověřili celý. Adresy, které jsme viděli, jsou v pořádku.`,
              `The sitemap contains at least ${totalLocs} entries with absolute URLs — the file is larger than what the audit downloads for this check (200 kB), so we could not verify the exact count or the 50,000-entry limit in full. The addresses we did see are correctly formed.`,
            )
          : t(
              `Sitemapa obsahuje ${totalLocs} ${entryLabel} se správnými absolutními URL a nepřekračuje limit 50 000 položek na soubor.`,
              `The sitemap contains ${totalLocs} ${entryLabel} with correct absolute URLs and does not exceed the 50,000-entries-per-file limit.`,
            ),
      });
    }

    /* --- Sitemapa do hloubky: lastmod --- */
    if (totalLocs > 0) {
      const lastmodMatches = [...sitemap.text.matchAll(/<lastmod>\s*([^<]*?)\s*<\/lastmod>/gi)].map((m) => m[1].trim());
      const validLastmodPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
      const validLastmod = lastmodMatches.filter((value) => validLastmodPattern.test(value)).length;
      const lastmodLabel = t('Datum poslední úpravy (lastmod)', 'Last-modified date (lastmod)');

      if (lastmodMatches.length === 0) {
        checks.push({
          id: 'sitemap-lastmod',
          label: lastmodLabel,
          status: 'warn',
          value: t('chybí u všech položek', 'missing on every entry'),
          weight: 1,
          detail: t(
            'Žádná položka v sitemapě neobsahuje `<lastmod>`. Bez data poslední úpravy Google neví, které stránky se od posledního procházení změnily, a musí je znovu stahovat všechny, aby to zjistil. Doplňte `<lastmod>` s datem skutečné poslední úpravy obsahu.',
            'No entry in the sitemap includes `<lastmod>`. Without a last-modified date, Google cannot tell which pages changed since the last crawl and has to re-download all of them to find out. Add `<lastmod>` with the date content was actually last changed.',
          ),
        });
      } else if (validLastmod < lastmodMatches.length) {
        const invalidCount = lastmodMatches.length - validLastmod;
        checks.push({
          id: 'sitemap-lastmod',
          label: lastmodLabel,
          status: 'warn',
          value: t(`${invalidCount} v neplatném formátu`, `${invalidCount} in an invalid format`),
          weight: 1,
          detail: t(
            `${invalidCount} hodnot \`<lastmod>\` nemá platný formát W3C Datetime (např. 2026-08-27 nebo 2026-08-27T10:00:00+02:00). Vyhledávače neplatné datum ignorují, jako by tam nebylo. Opravte formát v generátoru sitemapy.`,
            `${invalidCount} \`<lastmod>\` values are not in valid W3C Datetime format (e.g. 2026-08-27 or 2026-08-27T10:00:00+02:00). Search engines ignore an invalid date as if it were not there. Fix the format in the sitemap generator.`,
          ),
        });
      } else {
        checks.push({
          id: 'sitemap-lastmod',
          label: lastmodLabel,
          status: 'pass',
          value: t(`${lastmodMatches.length} z ${totalLocs}`, `${lastmodMatches.length} of ${totalLocs}`),
          weight: 1,
          detail: t(
            'Položky v sitemapě mají `<lastmod>` ve správném formátu. Google podle něj pozná, které stránky se od posledního procházení změnily, a nemusí stahovat znovu vše — šetří to crawl budget hlavně u větších webů.',
            'Entries in the sitemap carry `<lastmod>` in the correct format. Google uses it to tell which pages changed since the last crawl and does not have to re-download everything — this saves crawl budget, especially on larger sites.',
          ),
        });
      }
    }
  }

  /* --- HTTPS a mixed content --- */
  const httpsLabel = t('HTTPS a mixed content', 'HTTPS and mixed content');
  const isHttps = targetUrl.protocol === 'https:' && page.finalUrl.startsWith('https:');
  const mixed: string[] = [];
  const collectMixed = (selector: string, attribute: string) => {
    $(selector).each((_, element) => {
      const value = $(element).attr(attribute);
      if (value && /^http:\/\//i.test(value)) mixed.push(value);
    });
  };
  collectMixed('img[src]', 'src');
  collectMixed('script[src]', 'src');
  collectMixed('link[href]', 'href');
  collectMixed('iframe[src]', 'src');
  collectMixed('source[src]', 'src');

  if (!isHttps) {
    checks.push({
      id: 'https-mixed-content',
      label: httpsLabel,
      status: 'fail',
      value: t('bez HTTPS', 'no HTTPS'),
      weight: 3,
      blocker: t(
        'Web neběží na HTTPS. Prohlížeče ho označí za nezabezpečený a vyhledávače ho znevýhodní.',
        'The site does not run on HTTPS. Browsers mark it as insecure and search engines penalise it.',
      ),
      detail: t(
        'Stránka neběží na HTTPS, takže prohlížeče ji označí jako nezabezpečenou a Google ji znevýhodní. Nasaďte certifikát (Let’s Encrypt je zdarma) a nastavte trvalé přesměrování z HTTP na HTTPS. Bez šifrování nemá smysl řešit ostatní SEO detaily.',
        'The page does not run on HTTPS, so browsers mark it insecure and Google penalises it. Install a certificate (Let’s Encrypt is free) and set up a permanent redirect from HTTP to HTTPS. Without encryption, the rest of the SEO details do not matter.',
      ),
    });
  } else {
    checks.push({
      id: 'https-mixed-content',
      label: httpsLabel,
      status: mixed.length === 0 ? 'pass' : 'fail',
      value:
        mixed.length === 0
          ? t('čisté HTTPS', 'clean HTTPS')
          : t(
              `${mixed.length} ${pluralCz(mixed.length, 'nezabezpečený zdroj', 'nezabezpečené zdroje', 'nezabezpečených zdrojů')}`,
              `${mixed.length} insecure ${mixed.length === 1 ? 'resource' : 'resources'}`,
            ),
      weight: 3,
      detail:
        mixed.length === 0
          ? t(
              'Stránka běží na HTTPS a všechny nalezené zdroje se načítají také přes HTTPS. Prohlížeč tedy nebude nic blokovat ani hlásit jako nezabezpečené. Při vkládání externích skriptů a obrázků na to dál dohlížejte.',
              'The page runs on HTTPS and every resource found also loads over HTTPS, so the browser will not block anything or flag it as insecure. Keep an eye on this when embedding external scripts and images.',
            )
          : t(
              `Stránka běží na HTTPS, ale načítá ${mixed.length} zdrojů přes nezabezpečené http://. Prohlížeče takový obsah blokují nebo zobrazí varování, takže se části stránky nemusí vykreslit. Přepište uvedené adresy na https:// nebo je nahraďte protokolově relativními cestami.`,
              `The page runs on HTTPS but loads ${mixed.length} resources over insecure http://. Browsers block such content or show a warning, so parts of the page may not render. Rewrite the listed addresses to https:// or use protocol-relative paths.`,
            ),
      meta: mixed.length > 0 ? { kind: 'list', items: [...new Set(mixed)].slice(0, 8) } : undefined,
    });
  }

  /* --- Alt atributy obrázků --- */
  const altLabel = t('Alternativní texty obrázků', 'Image alt text');
  const images = $('img');
  const totalImages = images.length;
  if (totalImages === 0) {
    checks.push({
      id: 'image-alt',
      label: altLabel,
      status: 'pass',
      value: t('žádné obrázky', 'no images'),
      weight: 1,
      detail: t(
        'Ve staženém HTML nejsou žádné tagy `<img>`, takže není co kontrolovat. Pokud stránka obrázky vizuálně obsahuje, načítají se nejspíš přes JavaScript nebo jako CSS pozadí. U dekorativních pozadí je to v pořádku, u obsahových obrázků použijte `<img>` s popisem.',
        'The downloaded HTML has no `<img>` tags, so there is nothing to check. If the page visually contains images, they are most likely loaded via JavaScript or as CSS backgrounds. That is fine for decorative backgrounds; use `<img>` with a description for content images.',
      ),
    });
  } else {
    let missingAlt = 0;
    images.each((_, element) => {
      const alt = $(element).attr('alt');
      if (alt === undefined) missingAlt += 1;
    });
    const ratio = (missingAlt / totalImages) * 100;
    const pct = formatPercent(ratio, locale);
    checks.push({
      id: 'image-alt',
      label: altLabel,
      status: missingAlt === 0 ? 'pass' : ratio <= 20 ? 'warn' : 'fail',
      score: ramp(ratio, ALT_ANCHORS),
      value: t(
        `${missingAlt} z ${totalImages} bez alt (${pct})`,
        `${missingAlt} of ${totalImages} without alt (${pct})`,
      ),
      weight: 1,
      detail:
        missingAlt === 0
          ? t(
              'Všechny obrázky mají atribut `alt`. Obsah je tak přístupný pro čtečky obrazovky a obrázky mohou získat návštěvnost z vyhledávání obrázků. Kontrola hlídá jen chybějící atribut — prázdné `alt=""` u dekorativního obrázku je správně a za chybu se nepovažuje.',
              'Every image has an `alt` attribute, so the content is accessible to screen readers and the images can pick up traffic from image search. The check only looks for a missing attribute — an empty `alt=""` on a decorative image is correct and is not counted as a fault.',
            )
          : ratio <= 20
            ? t(
                `Menší část obrázků (${pct}) nemá atribut alt vůbec. Doplňte stručný popis toho, co je na obrázku; u čistě dekorativních stačí prázdné \`alt=""\`, které se za chybu nepočítá. Zlepší to přístupnost i viditelnost ve vyhledávání obrázků.`,
                `A minority of images (${pct}) has no alt attribute at all. Add a brief description of what is in the image; for purely decorative ones an empty \`alt=""\` is enough and is not counted as a fault. It improves accessibility and image-search visibility.`,
              )
            : t(
                `Většina obrázků (${pct}) nemá atribut alt vůbec, což je problém pro přístupnost i pro SEO. Projděte šablonu a doplňte popisy — u obsahových obrázků výstižný text, u dekorativních prázdné \`alt=""\`, které je správně. Bez toho čtečky obrazovky předčítají jen název souboru.`,
                `Most images (${pct}) have no alt attribute at all, which hurts both accessibility and SEO. Go through the template and add descriptions — meaningful text for content images, an empty \`alt=""\` for decorative ones, which is correct. Without it, screen readers just read out the file name.`,
              ),
    });
  }

  /* --- Strukturovaná data --- */
  const jsonLdLabel = t('Strukturovaná data (JSON-LD)', 'Structured data (JSON-LD)');
  const { entries, blocks, invalid } = extractJsonLd($);
  if (blocks === 0) {
    checks.push({
      id: 'structured-data',
      label: jsonLdLabel,
      status: 'fail',
      value: t('žádný blok', 'no blocks'),
      weight: 2,
      detail: t(
        'Stránka neobsahuje žádný blok `application/ld+json`. Přicházíte tak o rozšířené výsledky ve vyhledávání a o strojově čitelný popis obsahu. Doplňte alespoň schéma Organization nebo WebSite, u obsahových stránek Article nebo Product.',
        'The page contains no `application/ld+json` block, so you miss out on rich results and on a machine-readable description of the content. Add at least an Organization or WebSite schema, and Article or Product on content pages.',
      ),
    });
  } else if (entries.length === 0) {
    checks.push({
      id: 'structured-data',
      label: jsonLdLabel,
      status: 'fail',
      value: t(
        `${blocks} ${pluralCz(blocks, 'blok', 'bloky', 'bloků')}, žádný validní`,
        `${blocks} ${blocks === 1 ? 'block' : 'blocks'}, none valid`,
      ),
      weight: 2,
      detail: t(
        'Bloky JSON-LD na stránce jsou, ale ani jeden se nepodařilo naparsovat jako platný JSON. Vyhledávače takový záznam zahodí, takže je to stejné, jako by tam nebyl. Zkontrolujte čárky a uvozovky, typicky jde o chybu v šabloně.',
        'JSON-LD blocks are present, but none of them parses as valid JSON. Search engines discard such records, so it is as if they were not there. Check the commas and quotes — it is usually a template bug.',
      ),
    });
  } else {
    checks.push({
      id: 'structured-data',
      label: jsonLdLabel,
      status: invalid === 0 ? 'pass' : 'warn',
      value: t(
        `${entries.length} ${pluralCz(entries.length, 'entita', 'entity', 'entit')}`,
        `${entries.length} ${entries.length === 1 ? 'entity' : 'entities'}`,
      ),
      weight: 2,
      detail:
        invalid === 0
          ? t(
              'Stránka obsahuje alespoň jeden platný blok JSON-LD, takže vyhledávače dostávají strojově čitelný popis obsahu. Zvyšuje to šanci na rozšířené výsledky. Konkrétní typy si ověřte v Google Rich Results Testu.',
              'The page contains at least one valid JSON-LD block, so search engines get a machine-readable description of the content, which raises the chance of rich results. Verify the specific types in the Google Rich Results Test.',
            )
          : t(
              `Platná strukturovaná data na stránce jsou, ale ${invalid} ${pluralCz(invalid, 'blok se nepodařilo naparsovat', 'bloky se nepodařilo naparsovat', 'bloků se nepodařilo naparsovat')}. Vadné bloky vyhledávače ignorují a mohou působit nekonzistentně. Opravte syntaxi JSON v uvedených blocích.`,
              `Valid structured data is present, but ${invalid} ${invalid === 1 ? 'block' : 'blocks'} failed to parse. Search engines ignore the broken ones, which can look inconsistent. Fix the JSON syntax in those blocks.`,
            ),
    });
  }

  /* --- Open Graph --- */
  const ogTitle = ($('meta[property="og:title"]').attr('content') ?? '').trim();
  const ogDescription = ($('meta[property="og:description"]').attr('content') ?? '').trim();
  const ogImage = ($('meta[property="og:image"]').attr('content') ?? '').trim();
  const ogUrl = ($('meta[property="og:url"]').attr('content') ?? '').trim();
  const ogPresentCount = [ogTitle, ogDescription, ogImage].filter(Boolean).length;
  const ogImageAbsolute = ogImage ? /^https?:\/\//i.test(ogImage) : true;
  const ogLabel = t('Open Graph (náhled při sdílení)', 'Open Graph (social share preview)');

  const ogMissing: string[] = [];
  if (!ogTitle) ogMissing.push('og:title');
  if (!ogDescription) ogMissing.push('og:description');
  if (!ogImage) ogMissing.push('og:image');
  if (!ogUrl) ogMissing.push('og:url');

  checks.push({
    id: 'open-graph',
    label: ogLabel,
    status: ogPresentCount === 3 ? (ogImageAbsolute ? 'pass' : 'warn') : ogPresentCount > 0 ? 'warn' : 'fail',
    value:
      ogPresentCount === 3
        ? t('kompletní', 'complete')
        : t(`${ogPresentCount} ze 3 klíčových`, `${ogPresentCount} of 3 key tags`),
    weight: 2,
    detail:
      ogPresentCount === 3
        ? ogImageAbsolute
          ? t(
              'Stránka má vyplněné og:title, og:description i og:image, takže sdílení odkazu na Facebooku, LinkedInu, WhatsAppu nebo Slacku zobrazí hezký náhled místo holé adresy. Doplňte ještě og:url a og:type, pokud tam chybí.',
              'The page has og:title, og:description and og:image filled in, so sharing the link on Facebook, LinkedIn, WhatsApp or Slack shows a proper preview instead of a bare address. Add og:url and og:type too if they are missing.',
            )
          : t(
              `Klíčové Open Graph tagy jsou vyplněné, ale og:image (${ogImage}) není absolutní URL. Sociální sítě si obrázek stahují samy a s relativní cestou ho často nenajdou. Uveďte plnou adresu včetně https://.`,
              `The key Open Graph tags are filled in, but og:image (${ogImage}) is not an absolute URL. Social networks fetch the image themselves and often fail to find it with a relative path. Provide the full address including https://.`,
            )
        : ogPresentCount > 0
          ? t(
              `Open Graph tagy jsou jen částečně vyplněné, chybí: ${ogMissing.filter((tag) => tag !== 'og:url').join(', ')}. Bez kompletní sady sociální sítě doplní chybějící údaje samy, obvykle horším výběrem (třeba náhodný obrázek ze stránky). Doplňte všechny tři: og:title, og:description a og:image.`,
              `Open Graph tags are only partially filled in; missing: ${ogMissing.filter((tag) => tag !== 'og:url').join(', ')}. Without the complete set, social networks fill in the missing pieces themselves, usually with a worse choice (e.g. a random image from the page). Add all three: og:title, og:description and og:image.`,
            )
          : t(
              'Stránka nemá žádné Open Graph meta tagy. Při sdílení odkazu na sociálních sítích a v aplikacích jako Slack nebo WhatsApp se zobrazí jen holá adresa nebo náhodně vybraný obsah stránky. Doplňte alespoň og:title, og:description a og:image (ideálně 1200×630 px) do `<head>`.',
              'The page has no Open Graph meta tags. Sharing the link on social networks and in apps like Slack or WhatsApp shows only a bare address or randomly picked page content. Add at least og:title, og:description and og:image (ideally 1200×630 px) to `<head>`.',
            ),
  });

  /* --- Twitter Card --- */
  const twitterCard = ($('meta[name="twitter:card"]').attr('content') ?? '').trim().toLowerCase();
  const VALID_TWITTER_CARDS = ['summary', 'summary_large_image', 'app', 'player'];
  const twitterCardValid = VALID_TWITTER_CARDS.includes(twitterCard);
  const ogFallbackAvailable = Boolean(ogTitle && ogImage);
  const twitterLabel = t('Twitter / X Card', 'Twitter / X Card');

  checks.push({
    id: 'twitter-card',
    label: twitterLabel,
    status: twitterCardValid ? 'pass' : ogFallbackAvailable ? 'warn' : 'fail',
    value: twitterCard ? twitterCard : ogFallbackAvailable ? t('chybí, ale je fallback na OG', 'missing, but OG fallback exists') : t('chybí', 'missing'),
    weight: 1,
    detail: twitterCardValid
      ? t(
          `Meta tag twitter:card je nastavený na „${twitterCard}", takže X (dřívější Twitter) zobrazí u sdíleného odkazu vlastní naformátovaný náhled.`,
          `The twitter:card meta tag is set to "${twitterCard}", so X (formerly Twitter) shows its own formatted preview for the shared link.`,
        )
      : ogFallbackAvailable
        ? t(
            'Stránka nemá tag twitter:card, ale má vyplněné og:title a og:image, ze kterých si X (Twitter) náhled poskládá samo. Explicitní twitter:card je ale spolehlivější a umožní zvolit velký obrázkový formát (summary_large_image). Doplňte `<meta name="twitter:card" content="summary_large_image">`.',
            'The page has no twitter:card tag, but og:title and og:image are filled in, so X (Twitter) will assemble a preview from those on its own. An explicit twitter:card is more reliable, though, and lets you choose the large-image format (summary_large_image). Add `<meta name="twitter:card" content="summary_large_image">`.',
          )
        : t(
            'Stránka nemá ani twitter:card, ani Open Graph tagy, ze kterých by si X (Twitter) náhled poskládal. Sdílený odkaz se zobrazí bez náhledu. Doplňte `<meta name="twitter:card" content="summary_large_image">` spolu s Open Graph tagy.',
            'The page has neither a twitter:card tag nor Open Graph tags for X (Twitter) to build a preview from. The shared link will show with no preview. Add `<meta name="twitter:card" content="summary_large_image">` along with Open Graph tags.',
          ),
  });

  /* --- lang --- */
  const lang = ($('html').attr('lang') ?? '').trim();
  checks.push({
    id: 'html-lang',
    label: t('Atribut lang na <html>', 'The lang attribute on <html>'),
    status: lang ? 'pass' : 'fail',
    value: lang || missingValue,
    weight: 1,
    detail: lang
      ? t(
          `Jazyk stránky je deklarovaný jako „${lang}". Čtečky obrazovky zvolí správnou výslovnost a vyhledávače správně zacílí jazykovou verzi. U vícejazyčných webů doplňte ještě odkazy hreflang.`,
          `The page language is declared as “${lang}”. Screen readers pick the right pronunciation and search engines target the language version correctly. On multilingual sites, add hreflang links as well.`,
        )
      : t(
          'Tag `<html>` nemá atribut `lang`, takže není strojově jasné, v jakém jazyce je obsah. Doplňte například `<html lang="cs">`. Je to jednořádková oprava s přímým dopadem na přístupnost.',
          'The `<html>` tag has no `lang` attribute, so the content language is not machine-readable. Add something like `<html lang="en">`. It is a one-line fix with a direct effect on accessibility.',
        ),
  });

  return checks;
}
