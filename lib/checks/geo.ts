import { agentVerdict } from '../robots';
import { findValue } from '../jsonld';
import { pluralCz } from '../format';
import { translator, type Translate } from '../i18n';
import type { AuditContext, BotCategory, BotRow, CheckResult } from '../types';

interface BotDefinition {
  bot: string;
  vendor: string;
  category: BotCategory;
}

/** Trénovací boty sbírají data pro trénink; vyhledávací zajišťují citace v AI odpovědích. */
const BOTS: BotDefinition[] = [
  { bot: 'GPTBot', vendor: 'OpenAI', category: 'training' },
  { bot: 'OAI-SearchBot', vendor: 'OpenAI', category: 'search' },
  { bot: 'ClaudeBot', vendor: 'Anthropic', category: 'training' },
  { bot: 'Claude-SearchBot', vendor: 'Anthropic', category: 'search' },
  { bot: 'PerplexityBot', vendor: 'Perplexity', category: 'search' },
  { bot: 'Google-Extended', vendor: 'Google', category: 'training' },
  { bot: 'Applebot-Extended', vendor: 'Apple', category: 'training' },
  { bot: 'meta-externalagent', vendor: 'Meta', category: 'training' },
  { bot: 'CCBot', vendor: 'Common Crawl', category: 'training' },
  { bot: 'Bytespider', vendor: 'ByteDance', category: 'training' },
];

const ENTITY_PATTERNS: { domain: string; label: string }[] = [
  { domain: 'linkedin.com', label: 'LinkedIn' },
  { domain: 'wikidata.org', label: 'Wikidata' },
  { domain: 'crunchbase.com', label: 'Crunchbase' },
];

export function geoChecks(ctx: AuditContext): CheckResult[] {
  const t = translator(ctx.locale);
  const { $, llms, robots, robotsFailed } = ctx;
  const checks: CheckResult[] = [];

  /* --- llms.txt --- */
  const llmsLabel = t('Soubor /llms.txt', 'The /llms.txt file');
  const llmsLooksValid = llms.exists && llms.text.trim().length > 0 && !/<html/i.test(llms.text.slice(0, 400));
  if (llms.failed) {
    checks.push({
      id: 'llms-txt',
      label: llmsLabel,
      status: 'unknown',
      value: t('nepodařilo se ověřit', 'could not verify'),
      weight: 2,
      detail: t(
        'Existenci souboru /llms.txt se nepodařilo ověřit, protože požadavek selhal nebo vypršel. Zkuste adresu otevřít ručně. Do skóre se tato kontrola nezapočítává.',
        'Whether /llms.txt exists could not be verified because the request failed or timed out. Try opening the address manually. This check does not count towards the score.',
      ),
    });
  } else if (llmsLooksValid) {
    const mentioned = robots.exists && robots.mentionsLlmsTxt;
    checks.push({
      id: 'llms-txt',
      label: llmsLabel,
      status: mentioned ? 'pass' : 'warn',
      value: mentioned
        ? t('existuje a je odkázán z robots.txt', 'present and referenced from robots.txt')
        : t('existuje, není odkázán', 'present, not referenced'),
      weight: 2,
      detail: mentioned
        ? t(
            'Soubor /llms.txt existuje a robots.txt se o něm zmiňuje, takže jazykové modely dostanou stručnou mapu vašeho obsahu na správném místě. Je to zatím neoficiální, ale rychle přijímaný standard. Udržujte v něm aktuální odkazy na klíčové stránky a dokumentaci.',
            'The /llms.txt file exists and robots.txt points to it, so language models get a concise map of your content in the right place. It is still an unofficial standard, but adoption is fast. Keep the links to key pages and documentation up to date.',
          )
        : t(
            'Soubor /llms.txt na webu je, ale robots.txt na něj neodkazuje. Doplňte do robots.txt komentář nebo řádek s cestou k /llms.txt, aby ho nástroje snáz našly. Samotný soubor pak plní roli stručného rozcestníku pro jazykové modely.',
            'The site has /llms.txt but robots.txt does not reference it. Add a comment or a line with the path to /llms.txt in robots.txt so tools find it more easily. The file itself then acts as a short signpost for language models.',
          ),
    });
  } else {
    checks.push({
      id: 'llms-txt',
      label: llmsLabel,
      status: 'fail',
      value: llms.exists ? t('neplatný obsah', 'invalid content') : t('nenalezen', 'not found'),
      weight: 2,
      detail: llms.exists
        ? t(
            'Na adrese /llms.txt se sice něco vrací, ale vypadá to jako HTML stránka, ne jako textový soubor — server nejspíš vrací fallback. Nastavte skutečný textový soubor s typem text/plain. Jinak nástroje soubor vyhodnotí jako neexistující.',
            'Something is returned at /llms.txt, but it looks like an HTML page rather than a text file — the server is probably serving a fallback. Serve a real text file with the text/plain content type, otherwise tools will treat it as missing.',
          )
        : t(
            'Web nemá soubor /llms.txt. Jde o krátký markdownový rozcestník, který jazykovým modelům říká, které stránky jsou pro pochopení webu nejdůležitější. Vytvořte ho s odkazy na hlavní produktové stránky, dokumentaci a kontakt — je to práce na pár minut.',
            'The site has no /llms.txt. It is a short Markdown signpost telling language models which pages matter most for understanding the site. Create one with links to the main product pages, documentation and contact details — it takes minutes.',
          ),
    });
  }

  /* --- Pravidla pro AI boty --- */
  const botsLabel = t('Pravidla pro AI boty v robots.txt', 'AI bot rules in robots.txt');
  if (robotsFailed || !robots.exists) {
    checks.push({
      id: 'ai-bots',
      label: botsLabel,
      status: robotsFailed ? 'unknown' : 'warn',
      value: robotsFailed
        ? t('nepodařilo se ověřit', 'could not verify')
        : t('robots.txt neexistuje', 'no robots.txt'),
      weight: 3,
      detail: robotsFailed
        ? t(
            'Soubor robots.txt se nepodařilo stáhnout, takže pravidla pro AI boty nelze vyhodnotit. Ověřte dostupnost /robots.txt ručně. Do skóre se tato kontrola nezapočítává.',
            'The robots.txt file could not be downloaded, so AI bot rules cannot be evaluated. Check that /robots.txt is reachable. This check does not count towards the score.',
          )
        : t(
            'Web nemá robots.txt, takže žádný AI bot není nijak omezený — všichni mohou procházet vše. Pokud vám to vyhovuje, není co řešit; pokud chcete oddělit trénovací boty od vyhledávacích, robots.txt vytvořte. Vědomé rozhodnutí je lepší než náhodný stav.',
            'The site has no robots.txt, so no AI bot is restricted in any way — all of them may crawl everything. If that suits you, there is nothing to do; if you want to separate training bots from search bots, create one. A deliberate decision beats an accidental state.',
          ),
      meta: {
        kind: 'bots',
        rows: BOTS.map<BotRow>((definition) => ({
          ...definition,
          state: robotsFailed ? 'unknown' : 'unmentioned',
          source: 'none',
        })),
      },
    });
  } else {
    const rows: BotRow[] = BOTS.map((definition) => {
      const verdict = agentVerdict(robots, definition.bot);
      return { ...definition, state: verdict.state, source: verdict.source, rule: verdict.rule };
    });

    const searchBots = rows.filter((row) => row.category === 'search');
    const blockedSearch = searchBots.filter((row) => row.state === 'disallowed');
    const blockedTraining = rows.filter((row) => row.category === 'training' && row.state === 'disallowed');

    const status = blockedSearch.length === searchBots.length ? 'fail' : blockedSearch.length > 0 ? 'warn' : 'pass';

    checks.push({
      id: 'ai-bots',
      label: botsLabel,
      status,
      value:
        blockedSearch.length === 0
          ? t(
              `vyhledávací boty povoleny${blockedTraining.length > 0 ? `, ${blockedTraining.length} trénovacích blokováno` : ''}`,
              `search bots allowed${blockedTraining.length > 0 ? `, ${blockedTraining.length} training bots blocked` : ''}`,
            )
          : t(
              `${blockedSearch.length} z ${searchBots.length} vyhledávacích blokováno`,
              `${blockedSearch.length} of ${searchBots.length} search bots blocked`,
            ),
      weight: 3,
      detail:
        status === 'pass'
          ? blockedTraining.length > 0
            ? t(
                `Vyhledávací AI boty mají přístup, takže vás mohou citovat v odpovědích. Zároveň blokujete ${blockedTraining.length} ${pluralCz(blockedTraining.length, 'trénovacího bota', 'trénovací boty', 'trénovacích botů')} — to je legitimní volba, která viditelnost v AI odpovědích neomezuje. Přesně tak vypadá typické rozdělení „ano citacím, ne tréninku".`,
                `Search AI bots have access, so assistants can cite you in their answers. At the same time you block ${blockedTraining.length} training bot${blockedTraining.length === 1 ? '' : 's'} — a legitimate choice that does not reduce visibility in AI answers. This is exactly the usual “yes to citations, no to training” split.`,
              )
            : t(
                'Žádný ze sledovaných AI botů není blokovaný, takže váš obsah může být citovaný v AI odpovědích i použitý pro trénink. Pokud vám trénink na vašem obsahu nevyhovuje, zablokujte cíleně trénovací boty a vyhledávací nechte povolené. Rozdíl mezi oběma skupinami je v tabulce níže.',
                'None of the tracked AI bots is blocked, so your content can be cited in AI answers and also used for training. If training on your content does not suit you, block the training bots specifically and leave the search bots allowed. The table below shows which is which.',
              )
          : status === 'warn'
            ? t(
                `Část vyhledávacích AI botů je zablokovaná (${blockedSearch.map((row) => row.bot).join(', ')}), takže v odpovědích těchto asistentů se váš web neobjeví. Pokud to není záměr, odstraňte pro ně pravidlo Disallow. Blokovat je má smysl jen tehdy, když o návštěvnost z AI asistentů vyloženě nestojíte.`,
                `Some search AI bots are blocked (${blockedSearch.map((row) => row.bot).join(', ')}), so your site will not appear in those assistants’ answers. If that is not intentional, remove the Disallow rule for them. Blocking them only makes sense if you actively do not want traffic from AI assistants.`,
              )
            : t(
                'Všechny vyhledávací AI boty mají zakázaný přístup, takže vás žádný AI asistent nemůže citovat ani odkázat. Pokud jde o nedopatření — typicky plošné `Disallow: /` pod hvězdičkou — přicházíte o rychle rostoucí zdroj návštěvnosti. Povolte alespoň OAI-SearchBot, Claude-SearchBot a PerplexityBot.',
                'Every search AI bot is denied access, so no AI assistant can cite or link to you. If this is an oversight — typically a blanket `Disallow: /` under the wildcard agent — you are losing a fast-growing traffic source. Allow at least OAI-SearchBot, Claude-SearchBot and PerplexityBot.',
              ),
      meta: { kind: 'bots', rows },
    });
  }

  /* --- Odkazy na entitní profily --- */
  const foundEntities = new Map<string, string>();
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') ?? '';
    for (const pattern of ENTITY_PATTERNS) {
      if (href.toLowerCase().includes(pattern.domain) && !foundEntities.has(pattern.label)) {
        foundEntities.set(pattern.label, href);
      }
    }
  });
  const entityLabels = [...foundEntities.keys()];

  checks.push({
    id: 'entity-links',
    label: t('Odkazy na entitní profily', 'Links to entity profiles'),
    status: entityLabels.length >= 2 ? 'pass' : entityLabels.length === 1 ? 'warn' : 'fail',
    value: entityLabels.length > 0 ? entityLabels.join(', ') : t('žádné', 'none'),
    weight: 1,
    detail:
      entityLabels.length >= 2
        ? t(
            `Stránka odkazuje na externí profily (${entityLabels.join(', ')}), což pomáhá vyhledávačům i jazykovým modelům spojit web s konkrétní existující organizací. Tyto odkazy fungují jako potvrzení identity. Doplňte je ještě do schématu Organization přes vlastnost sameAs.`,
            `The page links to external profiles (${entityLabels.join(', ')}), which helps both search engines and language models tie the site to a real organisation. These links act as identity confirmation. Add them to your Organization schema via the sameAs property as well.`,
          )
        : entityLabels.length === 1
          ? t(
              `Našli jsme odkaz na ${entityLabels[0]}, ale jeden profil na jednoznačné určení entity nestačí. Doplňte do patičky nebo na kontaktní stránku další ověřitelné profily, ideálně Wikidata a Crunchbase. Víc nezávislých zdrojů zvyšuje důvěryhodnost v AI odpovědích.`,
              `We found a link to ${entityLabels[0]}, but one profile is not enough to pin down the entity. Add further verifiable profiles to the footer or contact page, ideally Wikidata and Crunchbase. More independent sources raise your credibility in AI answers.`,
            )
          : t(
              'V HTML nejsou žádné odkazy na LinkedIn, Wikidata ani Crunchbase. Jazykové modely pak hůř ověří, kdo za webem stojí, a méně ochotně vás uvedou jako zdroj. Přidejte do patičky odkazy na firemní profily a propojte je se schématem Organization pomocí sameAs.',
              'The HTML contains no links to LinkedIn, Wikidata or Crunchbase. Language models then struggle to verify who is behind the site and are less willing to name you as a source. Add company profile links to the footer and connect them to your Organization schema with sameAs.',
            ),
    meta: entityLabels.length > 0 ? { kind: 'list', items: [...foundEntities.values()].slice(0, 5) } : undefined,
  });

  /* --- Aktuálnost obsahu --- */
  checks.push(freshnessCheck(ctx, t));

  return checks;
}

/* ---------- Aktuálnost obsahu ---------- */

/**
 * Tvary, které uznáváme jako datum. Samotné `Date.parse` nestačí — V8 je
 * extrémně shovívavé a `"verze 3.2"` mu vyjde jako 1. 3. 2001, `"build 12"`
 * jako 30. 11. 2001. Bez tohohle filtru by kontrola hlásila datum tam,
 * kde žádné není.
 */
const DATE_PATTERNS: RegExp[] = [
  // ISO 8601: 2026-08-27, 2026-08-27T06:26:31+00:00, 2026-08-27 06:26
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i,
  // 2026/08/27
  /^\d{4}\/\d{2}\/\d{2}$/,
  // RFC 1123 (hlavička Last-Modified): Fri, 04 Sep 2026 16:48:51 GMT
  /^[a-z]{3},\s*\d{1,2}\s+[a-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}(\s*(GMT|UTC|[+-]\d{4}))?$/i,
  // 4 September 2026 / September 4, 2026
  /^\d{1,2}\s+[a-z]{3,}\s+\d{4}$/i,
  /^[a-z]{3,}\s+\d{1,2},\s*\d{4}$/i,
];

/** Datum musí mít rozpoznatelný tvar, jít rozparsovat a padnout do rozumného rozsahu. */
function parseDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || !DATE_PATTERNS.some((pattern) => pattern.test(value))) return null;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  const year = new Date(timestamp).getUTCFullYear();
  if (year < 1995 || year > new Date().getUTCFullYear() + 2) return null;
  return value;
}

interface FreshnessHit {
  source: string;
  value: string;
  /** true = jde o datum poslední úpravy, ne jen o datum vzniku. */
  isModified: boolean;
  /** true = signál je slabý (serverová hlavička, ne obsahová informace). */
  weak?: boolean;
}

function freshnessCheck(ctx: AuditContext, t: Translate): CheckResult {
  const { $, jsonLd, page } = ctx;
  const hits: FreshnessHit[] = [];
  const label = t('Signál aktuálnosti obsahu', 'Content freshness signal');
  const headerSource = t('hlavička Last-Modified', 'Last-Modified header');

  const push = (source: string, raw: string | undefined | null, isModified: boolean, weak = false) => {
    const value = parseDate(raw);
    if (value) hits.push({ source, value, isModified, weak });
  };

  const metaContent = (selector: string) => $(selector).first().attr('content');

  // 1) JSON-LD — nejsilnější a nejběžnější zdroj.
  push('JSON-LD dateModified', findValue(jsonLd, 'dateModified'), true);
  push('JSON-LD datePublished', findValue(jsonLd, 'datePublished'), false);
  push('JSON-LD uploadDate', findValue(jsonLd, 'uploadDate'), false);

  // 2) Meta tagy. Kromě Open Graphu i Dublin Core, který používají redakční systémy.
  push('meta article:modified_time', metaContent('meta[property="article:modified_time"]'), true);
  push('meta og:updated_time', metaContent('meta[property="og:updated_time"]'), true);
  push('meta dcterms.modified', metaContent('meta[name="dcterms.modified" i]'), true);
  push('meta DC.date.modified', metaContent('meta[name="DC.date.modified" i]'), true);
  push('meta last-modified', metaContent('meta[name="last-modified" i]'), true);
  push('meta revised', metaContent('meta[name="revised" i]'), true);
  push('meta http-equiv last-modified', metaContent('meta[http-equiv="last-modified" i]'), true);
  push('meta article:published_time', metaContent('meta[property="article:published_time"]'), false);
  push('meta date', metaContent('meta[name="date" i]'), false);
  push('meta DC.date', metaContent('meta[name="DC.date" i]'), false);
  push('meta dcterms.created', metaContent('meta[name="dcterms.created" i]'), false);

  // 3) Mikrodata (itemprop) — hodnota bývá v content, datetime nebo v textu.
  $('[itemprop="dateModified"], [itemprop="datePublished"]').each((_, element) => {
    const node = $(element);
    const isModified = (node.attr('itemprop') ?? '').toLowerCase() === 'datemodified';
    const raw = node.attr('content') ?? node.attr('datetime') ?? node.text();
    push(`itemprop ${node.attr('itemprop')}`, raw, isModified);
  });

  // 4) <time datetime> — slabší, ale pořád strojově čitelné.
  $('time[datetime]').each((_, element) => {
    push('<time datetime>', $(element).attr('datetime'), false);
  });

  // 5) Hlavička Last-Modified. Nejslabší signál: u dynamicky generovaných stránek
  //    často nese čas požadavku, ne skutečnou úpravu obsahu. Nikdy nedá `pass`.
  push(headerSource, page.headers['last-modified'], true, true);

  const strong = hits.find((hit) => hit.isModified && !hit.weak);
  const best = strong ?? hits[0] ?? null;

  const sources = hits.map((hit) => `${hit.source} → ${hit.value}`);

  if (!best) {
    return {
      id: 'content-freshness',
      label,
      status: 'fail',
      value: t('chybí', 'missing'),
      weight: 1,
      detail: t(
        'Stránka nikde strojově neuvádí datum publikace ani poslední aktualizace — hledali jsme v JSON-LD, v meta tazích (Open Graph i Dublin Core), v mikrodatech, v tagu `<time>` i v hlavičce Last-Modified. Pro AI asistenty je pak obsah nedatovaný a při volbě zdroje jsou opatrnější. Doplňte do JSON-LD `datePublished` a `dateModified`.',
        'The page states no machine-readable publication or update date anywhere — we looked in JSON-LD, in meta tags (both Open Graph and Dublin Core), in microdata, in the `<time>` tag and in the Last-Modified header. To AI assistants the content is undated, which makes them more cautious about using it. Add `datePublished` and `dateModified` to your JSON-LD.',
      ),
    };
  }

  const onlyServerHeader = hits.every((hit) => hit.weak);

  return {
    id: 'content-freshness',
    label,
    status: strong ? 'pass' : 'warn',
    value: `${best.source.replace(/^(JSON-LD|meta|itemprop) /, '')}: ${best.value.slice(0, 25)}`,
    weight: 1,
    detail: strong
      ? t(
          `Stránka strojově uvádí datum poslední aktualizace (${strong.source}), což je pro AI asistenty i vyhledávače silný signál aktuálnosti. Při výběru zdroje pro odpověď dostávají čerstvější stránky přednost. Hlídejte, aby se datum měnilo jen při skutečné úpravě obsahu, ne při každém nasazení.`,
          `The page states a machine-readable last-updated date (${strong.source}), a strong freshness signal for both AI assistants and search engines. Fresher pages get preference when a source is picked for an answer. Make sure the date only changes on a real content edit, not on every deploy.`,
        )
      : onlyServerHeader
        ? t(
            'Jediný nalezený údaj o stáří je serverová hlavička Last-Modified. To je slabý signál — u dynamicky generovaných stránek často nese čas požadavku, ne skutečnou úpravu obsahu, a vyhledávače se na něj nespoléhají. Doplňte do JSON-LD vlastnosti `datePublished` a `dateModified`.',
            'The only age information found is the server’s Last-Modified header. That is a weak signal — on dynamically generated pages it often carries the request time rather than a real content edit, and search engines do not rely on it. Add `datePublished` and `dateModified` to your JSON-LD.',
          )
        : t(
            `Stránka uvádí datum vzniku (${best.source}), ale ne datum poslední aktualizace. AI asistenti tak nepoznají, zda je obsah stále platný. Doplňte do JSON-LD vlastnost \`dateModified\` a aktualizujte ji při každé revizi textu.`,
            `The page states a creation date (${best.source}) but no last-updated date, so AI assistants cannot tell whether the content is still current. Add a \`dateModified\` property to your JSON-LD and update it whenever you revise the text.`,
          ),
    meta: { kind: 'list', items: sources.slice(0, 6) },
  };
}
