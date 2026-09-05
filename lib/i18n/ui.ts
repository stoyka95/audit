import type { Locale } from './index';

/**
 * Texty rozhraní. Na rozdíl od kontrol jde o souvislé bloky obsahu, které se
 * nevybírají podle naměřené hodnoty — tady je slovník na místě.
 *
 * Angličtina je typovaná podle češtiny (`UiDict = typeof cs`), takže vynechaný
 * klíč neprojde překladem. Přidání textu do jednoho jazyka si vynutí i druhý.
 */
const cs = {
  brand: 'Audit webu',
  metaTitle: 'Audit webu — Rychlost, SEO, AEO, GEO',
  metaDescription:
    'Vložte URL a během chvíle získáte pravidly řízený audit rychlosti, SEO, připravenosti na AI odpovědi a technického stavu webu.',

  nav: {
    aria: 'Hlavní navigace',
    home: 'Audit webu — na začátek',
    cta: 'Spustit audit',
    sections: {
      audit: 'Audit',
      how: 'Jak to funguje',
      what: 'Co kontrolujeme',
      advice: 'Doporučení',
      faq: 'FAQ',
    },
  },

  theme: {
    toLight: 'Přepnout na světlý režim',
    toDark: 'Přepnout na tmavý režim',
    light: 'Světlý režim',
    dark: 'Tmavý režim',
  },

  language: {
    aria: 'Jazyk rozhraní',
    switchTo: 'Switch to English',
    short: { cs: 'CS', en: 'EN' },
  },

  form: {
    label: 'Adresa webu k auditu',
    placeholder: 'www.vase-domena.cz',
    submit: 'Auditovat',
    running: 'Probíhá…',
  },

  hero: {
    chip: 'Bez registrace · výsledek do dvou minut',
    titleBefore: 'Zjistěte, jak váš web vidí Google ',
    titleAccent: 'i umělá inteligence',
    lead:
      'Vložte adresu a nástroj projde přes třicet konkrétních kontrol — od Core Web Vitals přes ' +
      'strukturovaná data až po pravidla pro AI boty. Žádné obecné rady od jazykového modelu, ' +
      'jen měřitelná fakta a předem připravená doporučení.',
    note:
      'Audit pracuje se staženým HTML. U webů, které obsah vykreslují až JavaScriptem (SPA), ' +
      'nemusí statické stažení vidět všechno. Rychlostní část využívá Google PageSpeed Insights — ' +
      'bez vlastního API klíče platí nižší limit požadavků.',
  },

  categories: [
    {
      title: 'Rychlost',
      weight: '25 %',
      description: 'Core Web Vitals z PageSpeed Insights, měřené zvlášť pro mobil a pro počítač.',
      items: ['LCP', 'INP / TBT', 'CLS', 'TTFB', 'Performance skóre'],
    },
    {
      title: 'SEO',
      weight: '30 %',
      description: 'Základ indexovatelnosti a on-page signály, které rozhodují o pozici ve vyhledávání.',
      items: ['noindex', 'Title', 'H1', 'Canonical', 'robots.txt', 'Sitemapa', 'Mixed content'],
    },
    {
      title: 'AEO',
      weight: '15 %',
      description: 'Připravenost obsahu na to, aby z něj šla vytáhnout přímá odpověď.',
      items: ['FAQ / HowTo schéma', 'Otázkové nadpisy', 'Přímá odpověď', 'Délka odstavců'],
    },
    {
      title: 'GEO',
      weight: '15 %',
      description: 'Viditelnost pro generativní AI a pravidla pro boty, které vás mohou citovat.',
      items: ['llms.txt', 'AI boti', 'Entitní profily', 'Aktuálnost obsahu'],
    },
    {
      title: 'Správnost',
      weight: '15 %',
      description: 'Technický stav a spolehlivost — věci, které tiše kazí zážitek i procházení.',
      items: ['Viewport', 'Favicon', 'Rozbité odkazy', 'Bezpečnostní hlavičky'],
    },
  ],

  how: {
    eyebrow: 'Jak to funguje',
    title: 'Čtyři kroky, žádná černá skříňka',
    lead:
      'Celý audit je posloupnost konkrétních měření a pravidel. Každé číslo v reportu se dá dohledat ' +
      'až ke kontrole, ze které pochází.',
    steps: [
      {
        step: '01',
        title: 'Stáhneme HTML',
        text: 'Načteme zdrojový kód zadané adresy a rovnou změříme odezvu serveru. Žádný prohlížeč se nespouští, takže je to otázka zlomku sekundy.',
      },
      {
        step: '02',
        title: 'Sáhneme na doprovodné soubory',
        text: 'Souběžně čteme robots.txt, llms.txt a sitemapu a ověřujeme až patnáct interních odkazů. Když některý zdroj vypadne, audit doběhne bez něj.',
      },
      {
        step: '03',
        title: 'Změříme rychlost u Googlu',
        text: 'PageSpeed Insights změří Core Web Vitals pro mobil i pro počítač. Obě měření běží souběžně, každé ve vlastním požadavku, a při selhání se opakují.',
      },
      {
        step: '04',
        title: 'Spočítáme skóre podle pravidel',
        text: 'Každá kontrola má stav a váhu. Doporučení jsou předem napsaná a vybírají se podle naměřené hodnoty — nic negeneruje jazykový model.',
      },
    ],
  },

  what: {
    eyebrow: 'Co kontrolujeme',
    title: 'Přes třicet kontrol v pěti oblastech',
    lead:
      'Váhy u kategorií říkají, jakou částí se podílejí na celkovém skóre. Rychlost se počítá zvlášť ' +
      'pro mobil a pro počítač, dohromady tvoří 25 %.',
    scoreShare: 'skóre',
  },

  advice: {
    eyebrow: 'Obecná doporučení',
    title: 'Co s výsledkem udělat jako první',
    lead:
      'Rady, které platí napříč weby, ať vám audit vyjde jakkoli. Konkrétní doporučení k jednotlivým ' +
      'nálezům najdete rozbalením kontroly v reportu.',
    items: [
      {
        tag: 'Pořadí',
        title: 'Nejdřív fatální nálezy, pak čísla',
        text: 'Pokud report ukáže červený pruh nahoře, nemá smysl ladit LCP. Direktiva noindex nebo zákaz v robots.txt znamená, že web ve vyhledávání prostě není — a dokud to platí, ostatní optimalizace nikdo neuvidí.',
      },
      {
        tag: 'Rychlost',
        title: 'Jeden obrázek často rozhodne',
        text: 'U většiny webů je hlavní brzdou jediný velký obrázek nad ohybem. Zmenšit ho, převést do WebP nebo AVIF a dát mu pevné rozměry obvykle spraví LCP i CLS zároveň.',
      },
      {
        tag: 'AEO',
        title: 'Odpověď napřed, kontext potom',
        text: 'Pod každý nadpis dejte jednu až dvě věty, které otázku přímo zodpoví, a teprve pak rozvádějte. Tenhle vzorec je základ toho, aby vás asistenti citovali.',
      },
      {
        tag: 'GEO',
        title: 'Rozlišujte trénink a citace',
        text: 'Blokovat GPTBot nebo ClaudeBot a přitom nechat projít OAI-SearchBot, Claude-SearchBot a PerplexityBot je rozumná kombinace. Plošné Disallow vás ale odřízne i od citací.',
      },
      {
        tag: 'Měření',
        title: 'Spusťte audit dvakrát',
        text: 'Lighthouse měří pokaždé trochu jinak a rozdíl deseti bodů mezi běhy je běžný. Než začnete něco opravovat, ověřte si, že nález není jen výkyv měření.',
      },
      {
        tag: 'Rozsah',
        title: 'Audit vidí jednu stránku',
        text: 'Hodnotí se přesně ta adresa, kterou zadáte — ne celý web. Projděte zvlášť homepage, typickou produktovou stránku a jeden článek; nálezy se u nich obvykle liší.',
      },
    ],
  },

  faq: {
    eyebrow: 'Časté dotazy',
    title: 'Na co se ptají nejčastěji',
    lead: 'Kdyby něco chybělo, odpověď bývá i přímo v reportu — každá kontrola má vlastní vysvětlení.',
    items: [
      {
        q: 'Co znamenají zkratky AEO a GEO?',
        a: 'AEO (Answer Engine Optimization) je připravenost stránky na to, aby z ní šla vytáhnout přímá odpověď — tedy FAQ schéma, otázkové nadpisy, krátké odstavce a členěný obsah. GEO (Generative Engine Optimization) řeší viditelnost pro generativní AI: jestli má web soubor llms.txt, jestli v robots.txt nechává projít vyhledávací boty jako OAI-SearchBot nebo PerplexityBot a jestli se dá ověřit, kdo za webem stojí.',
      },
      {
        q: 'Jak se počítá celkové skóre?',
        a: 'Každá kontrola má stav (v pořádku / ke zlepšení / chybí) a váhu podle závažnosti. Skóre kategorie je jejich vážený průměr, celkové skóre pak vážený průměr kategorií — SEO 30 %, rychlost dohromady 25 %, AEO, GEO a Správnost po 15 %. Měřitelné metriky jako LCP nebo CLS se nepřevádějí natvrdo, ale plynule, takže i malé zlepšení je ve skóre vidět.',
      },
      {
        q: 'Proč je někdy u kategorie pomlčka místo čísla?',
        a: 'Když se nepodaří ověřit dost kontrol v kategorii (typicky když nedoběhne měření PageSpeed Insights), zobrazí se pomlčka. Číslo spočítané ze dvou zbývajících kontrol by totiž vypadalo důvěryhodně, ale nic by neříkalo. Taková kategorie se z celkového skóre vynechá a v reportu se objeví tlačítko, kterým se dá chybějící měření doměřit.',
      },
      {
        q: 'Proč se rychlost měří zvlášť pro mobil a pro počítač?',
        a: 'Výsledky se běžně liší o desítky bodů — stránka může být na desktopu svižná a na mobilu se plazit. Google navíc indexuje mobile-first, takže mobilní hodnota váží víc. Obě měření si prohlížeč vyžádá samostatnými požadavky a pouští je souběžně, protože Lighthouse u Googlu je nejpomalejší část celého auditu. Report se zobrazí až s oběma výsledky.',
      },
      {
        q: 'Co je „fatální nález" a proč zastropuje skóre?',
        a: 'Direktiva noindex, zákaz procházení celého webu v robots.txt, chybějící HTTPS nebo chybová odpověď serveru znamenají, že web ve vyhledávání prakticky není. Bez stropu by takový web dostal i 90 bodů, protože ostatní kontroly by prošly. Proto se skóre v takovém případě zastropuje na 35 bodech a nad reportem se objeví červené upozornění.',
      },
      {
        q: 'Vidí audit i obsah, který se načítá JavaScriptem?',
        a: 'Ne. Audit pracuje se staženým HTML, nespouští prohlížeč. U webů, které obsah dogenerovávají až v prohlížeči (SPA), tak nemusí vidět texty, nadpisy ani odkazy. Pokud stránka takhle vypadá, report na to sám upozorní v poznámkách k měření. Rychlostní část tím ovlivněná není — tu měří Google vlastním prohlížečem.',
      },
      {
        q: 'Generuje doporučení umělá inteligence?',
        a: 'Ne. Všechny texty jsou předem napsané a vybírají se podle výsledku konkrétní kontroly. Když u LCP uvidíte doporučení, je to tentýž text, který dostane každý web se stejným rozsahem hodnot. Díky tomu jsou rady konzistentní, ověřitelné a nemůže se stát, že si nástroj něco vymyslí.',
      },
      {
        q: 'Ukládají se výsledky auditu?',
        a: 'Ne. Nic se neukládá do databáze ani do historie — audit se počítá při každém požadavku znovu a výsledek existuje jen ve vašem prohlížeči. Pokud si report chcete uchovat, uložte si stránku nebo si ji vytiskněte do PDF.',
      },
    ],
  },

  cta: {
    title: 'Zbývá zadat adresu.',
    text:
      'Audit trvá zhruba minutu, u pomalejších webů i o něco déle, a nikam se neukládá. Klidně ho ' +
      'pusťte na konkurenci — potřebujete jen veřejnou URL.',
    button: 'Spustit audit',
  },

  loading: {
    eyebrow: 'Probíhá audit',
    elapsed: 'uplynulo',
    seconds: 's',
    hint: {
      before: 'Obě rychlostní měření běží souběžně, každé ve vlastním požadavku. U rychlých webů je hotovo ',
      fast: 'do minuty',
      after:
        ', u pomalejších se měření opakuje a čekání může přesáhnout dvě minuty. Když ani opakování ' +
        'nestačí, report se zobrazí bez něj a chybějící část se dá doměřit jedním tlačítkem.',
    },
    steps: {
      page: {
        label: 'Stahuji stránku a doprovodné soubory',
        hint: 'HTML, robots.txt, llms.txt, sitemapa a interní odkazy.',
        checksDone: 'kontrol hotovo',
      },
      mobile: 'Měřím rychlost na mobilu',
      desktop: 'Měřím rychlost na počítači',
      speedHint:
        'Lighthouse u Googlu měří Core Web Vitals. Obě zařízení běží souběžně, každé ve vlastním požadavku.',
      retryHint:
        '. pokus — předchozí měření nedoběhlo v limitu. Google ho mezitím dopočítal, tenhle pokus proto bývá rychlý.',
      fieldData: 'reálná data z CrUX',
      labData: 'laboratorní měření',
    },
    tips: [
      {
        tag: 'Rychlost',
        text: 'Největšímu obrázku nad ohybem dejte `fetchpriority="high"` a pevné rozměry. Zrychlí to LCP a zároveň srazí poskakování layoutu.',
      },
      {
        tag: 'AEO',
        text: 'Pod každý nadpis dejte odpověď do 50 slov a teprve pak detaily. Právě takové úseky si AI asistenti berou do odpovědí.',
      },
      {
        tag: 'GEO',
        text: 'Blokovat trénovací boty a nechat projít ty vyhledávací je legitimní kombinace. Zakázat oboje ale znamená, že vás žádný asistent neodcituje.',
      },
      {
        tag: 'SEO',
        text: 'Titulek do 60 znaků se ve výsledcích zobrazí celý. Nejdůležitější klíčové slovo patří na začátek, značka na konec.',
      },
      {
        tag: 'Technika',
        text: 'Chybí-li `<meta name="viewport">`, Google stránku hodnotí jako nepřipravenou pro mobil — a to je dnes hlavní zařízení pro indexaci.',
      },
      {
        tag: 'Obsah',
        text: 'Doplňte do JSON-LD `dateModified` a měňte ho jen při skutečné úpravě textu. Nedatovaný obsah si asistenti vybírají jako zdroj méně ochotně.',
      },
      {
        tag: 'Rychlost',
        text: 'TTFB nad 800 ms zdržuje úplně všechno, co následuje. Stránková cache nebo CDN je většinou nejlevnější zlepšení, jaké můžete udělat.',
      },
      {
        tag: 'AEO',
        text: 'Kroky a parametry patří do `<ol>` a `<table>`, ne do souvislých vět. Strukturovaný blok se cituje mnohem snáz než odstavec.',
      },
    ],
  },

  report: {
    eyebrow: 'Výsledek auditu',
    total: 'celkem',
    reset: 'Nový audit',
    summary: {
      great: 'Web je v dobré kondici. Zbývají spíš detaily a udržování stavu.',
      good: 'Základ je solidní. Několik oprav ho posune do zelené zóny.',
      average: 'Web funguje, ale nechává na stole měřitelnou část výkonu i viditelnosti.',
      poor: 'Několik zásadních věcí chybí. Začněte položkami označenými červeně.',
    },
    chips: {
      audit: 'audit',
      html: 'HTML',
      verified: ' % kontrol ověřeno',
      ofCategories: 'kategorií',
      verifiedShort: ' % ověřeno',
      confidenceTitle: 'Podíl kontrol, které se podařilo ověřit. Neověřené se do skóre nepočítají.',
    },
    blockers: {
      one: 'Fatální nález',
      many: 'Fatální nálezy',
      title: 'Web je pro vyhledávače prakticky neviditelný',
      capBefore: 'Dokud tohle platí, nemá smysl řešit dílčí optimalizace. Celkové skóre je proto zastropované na ',
      capAfter: ' bodech bez ohledu na to, jak dopadly ostatní kontroly.',
    },
    missing: {
      eyebrow: 'Nedokončená měření',
      one: 'Rychlost na %s se nepodařilo změřit.',
      both: 'Ani jedno rychlostní měření se nepodařilo dokončit.',
      explain:
        'Lighthouse u Googlu vypadává nepravidelně a další pokus po chvíli obvykle projde. Doměří se ' +
        'jen chybějící část, zbytek reportu zůstane, jak je.',
      button: 'Doměřit rychlost na %s',
      running: 'Měřím rychlost na %s…',
      mobile: 'mobilu',
      desktop: 'počítači',
    },
    issues: 'Začněte tímto',
    notes: 'Poznámky k měření',
  },

  category: {
    unscored: 'Neověřeno',
    pass: 'v pořádku',
    warn: 'ke zlepšení',
    fail: 'chybí',
    unknown: 'neověřeno',
    info: 'informativní',
    infoTitle: 'Informativní řádky, které do skóre nevstupují.',
  },

  check: {
    status: {
      pass: 'V pořádku',
      warn: 'Ke zlepšení',
      fail: 'Chybí',
      unknown: 'Neověřeno',
    },
    statePrefix: 'Stav: ',
    notScored: '· neboduje se',
    notScoredTitle: 'Kontrola je informativní, do skóre nevstupuje.',
    error: 'chyba',
    bots: {
      search: 'Vyhledávací / citující boty',
      searchHint: 'Rozhodují, jestli vás AI asistent může uvést jako zdroj.',
      training: 'Trénovací boty',
      trainingHint: 'Sbírají data pro trénink modelů. Jejich blokace je legitimní volba.',
      allowed: 'povoleno',
      disallowed: 'zakázáno',
      partial: 'částečně',
      unmentioned: 'nezmíněno',
      unknown: 'neověřeno',
    },
  },

  footer: {
    aria: 'Patička',
    tagline:
      'Pravidly řízený audit rychlosti, SEO, AEO, GEO a technického stavu. Všechna doporučení jsou ' +
      'předem napsaná a navázaná na konkrétní kontrolu — nic negeneruje jazykový model.',
    facts: [
      { label: 'Kontrol', value: '30+' },
      { label: 'Kategorií', value: '6' },
      { label: 'Uložených dat', value: '0' },
    ],
    contents: 'Obsah',
    sources: 'Zdroje dat',
    noteLeft: 'Audit se počítá při každém požadavku znovu a nikam se neukládá.',
    noteRight: 'Měřeno pro mobil i pro počítač · data z Googlu se mohou mezi běhy lišit.',
    credit: 'Vytvořil a provozuje Semakod',
    copyright: '© 2026 Semakod · Mykola Stoyka · IČO 01796763',
    cookieSettings: 'Nastavení cookies',
  },

  cookie: {
    text: 'Používáme volitelnou analytiku (Google Tag Manager), abychom viděli, jak si audit vede. Bez souhlasu se nic neukládá a analytika se vůbec nenačte.',
    accept: 'Přijmout',
    reject: 'Odmítnout',
  },

  errors: {
    network: 'Nepodařilo se spojit se serverem.',
    networkDetail: 'Zkontrolujte připojení a zkuste audit spustit znovu.',
    generic: 'Audit se nepodařilo dokončit.',
  },

  notFound: {
    code: '404',
    title: 'Tahle stránka neexistuje.',
    text: 'Adresa buď nikdy nebyla, nebo se přesunula jinam. Zkuste spustit audit, nebo se podívejte, co dělá Semakod.',
    backHome: 'Zpět na audit',
    visitSemakod: 'Navštívit semakod.cz',
    browseServices: 'Prohlédnout služby',
  },
};

export type UiDict = typeof cs;

const en: UiDict = {
  brand: 'Site Audit',
  metaTitle: 'Site Audit — Speed, SEO, AEO, GEO',
  metaDescription:
    'Enter a URL and get a rule-driven audit of speed, SEO, readiness for AI answers and technical health within a minute.',

  nav: {
    aria: 'Main navigation',
    home: 'Site Audit — back to top',
    cta: 'Run an audit',
    sections: {
      audit: 'Audit',
      how: 'How it works',
      what: 'What we check',
      advice: 'Advice',
      faq: 'FAQ',
    },
  },

  theme: {
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    light: 'Light mode',
    dark: 'Dark mode',
  },

  language: {
    aria: 'Interface language',
    switchTo: 'Přepnout do češtiny',
    short: { cs: 'CS', en: 'EN' },
  },

  form: {
    label: 'Website address to audit',
    placeholder: 'www.your-domain.com',
    submit: 'Audit',
    running: 'Running…',
  },

  hero: {
    chip: 'No sign-up · results within two minutes',
    titleBefore: 'See how your site looks to Google ',
    titleAccent: 'and to AI',
    lead:
      'Enter an address and the tool runs more than thirty concrete checks — from Core Web Vitals ' +
      'through structured data to AI bot rules. No generic advice from a language model, just ' +
      'measurable facts and pre-written recommendations.',
    note:
      'The audit works with the downloaded HTML. On sites that render content with JavaScript (SPAs), ' +
      'a static fetch may not see everything. The speed section uses Google PageSpeed Insights — ' +
      'without your own API key a lower request limit applies.',
  },

  categories: [
    {
      title: 'Speed',
      weight: '25%',
      description: 'Core Web Vitals from PageSpeed Insights, measured separately for mobile and desktop.',
      items: ['LCP', 'INP / TBT', 'CLS', 'TTFB', 'Performance score'],
    },
    {
      title: 'SEO',
      weight: '30%',
      description: 'Indexability basics and the on-page signals that decide your position in search.',
      items: ['noindex', 'Title', 'H1', 'Canonical', 'robots.txt', 'Sitemap', 'Mixed content'],
    },
    {
      title: 'AEO',
      weight: '15%',
      description: 'How ready the content is for a direct answer to be extracted from it.',
      items: ['FAQ / HowTo schema', 'Question headings', 'Direct answer', 'Paragraph length'],
    },
    {
      title: 'GEO',
      weight: '15%',
      description: 'Visibility for generative AI and rules for the bots that may cite you.',
      items: ['llms.txt', 'AI bots', 'Entity profiles', 'Content freshness'],
    },
    {
      title: 'Soundness',
      weight: '15%',
      description: 'Technical health and reliability — the things that quietly spoil both browsing and crawling.',
      items: ['Viewport', 'Favicon', 'Broken links', 'Security headers'],
    },
  ],

  how: {
    eyebrow: 'How it works',
    title: 'Four steps, no black box',
    lead:
      'The whole audit is a sequence of concrete measurements and rules. Every number in the report ' +
      'traces back to the check it came from.',
    steps: [
      {
        step: '01',
        title: 'We fetch the HTML',
        text: 'We load the source of the given address and measure the server response along the way. No browser is launched, so it takes a fraction of a second.',
      },
      {
        step: '02',
        title: 'We read the companion files',
        text: 'In parallel we read robots.txt, llms.txt and the sitemap, and verify up to fifteen internal links. If a source drops out, the audit finishes without it.',
      },
      {
        step: '03',
        title: 'We measure speed at Google',
        text: 'PageSpeed Insights measures Core Web Vitals for both mobile and desktop. The two runs go in parallel, each in its own request, and are retried on failure.',
      },
      {
        step: '04',
        title: 'We score it by rules',
        text: 'Every check has a status and a weight. The recommendations are pre-written and picked by the measured value — nothing is generated by a language model.',
      },
    ],
  },

  what: {
    eyebrow: 'What we check',
    title: 'Over thirty checks across five areas',
    lead:
      'The weight on each category is the share it contributes to the overall score. Speed is measured ' +
      'separately for mobile and desktop, together making up 25%.',
    scoreShare: 'of score',
  },

  advice: {
    eyebrow: 'General advice',
    title: 'What to do with the result first',
    lead:
      'Advice that holds across sites, whatever your audit says. Recommendations for individual ' +
      'findings are inside each check in the report.',
    items: [
      {
        tag: 'Order',
        title: 'Fatal findings first, numbers second',
        text: 'If the report shows a red band at the top, tuning LCP is pointless. A noindex directive or a robots.txt ban means the site simply is not in search — and while that holds, nobody sees any other optimisation.',
      },
      {
        tag: 'Speed',
        title: 'One image often decides it',
        text: 'On most sites the main brake is a single large image above the fold. Shrinking it, converting to WebP or AVIF and giving it fixed dimensions usually fixes LCP and CLS at once.',
      },
      {
        tag: 'AEO',
        title: 'Answer first, context second',
        text: 'Put one or two sentences that directly answer the question under each heading, and only then elaborate. This pattern is the basis of getting cited by assistants.',
      },
      {
        tag: 'GEO',
        title: 'Separate training from citation',
        text: 'Blocking GPTBot or ClaudeBot while letting OAI-SearchBot, Claude-SearchBot and PerplexityBot through is a sensible combination. A blanket Disallow cuts you off from citations too.',
      },
      {
        tag: 'Measurement',
        title: 'Run the audit twice',
        text: 'Lighthouse measures slightly differently every time and a ten-point gap between runs is normal. Before you fix anything, confirm the finding is not just measurement noise.',
      },
      {
        tag: 'Scope',
        title: 'The audit sees one page',
        text: 'Exactly the address you enter is evaluated — not the whole site. Run the homepage, a typical product page and one article separately; their findings usually differ.',
      },
    ],
  },

  faq: {
    eyebrow: 'Frequently asked',
    title: 'What people ask most',
    lead: 'If something is missing, the answer is often in the report itself — every check has its own explanation.',
    items: [
      {
        q: 'What do AEO and GEO stand for?',
        a: 'AEO (Answer Engine Optimization) is how ready a page is for a direct answer to be extracted from it — FAQ schema, question-style headings, short paragraphs and structured content. GEO (Generative Engine Optimization) covers visibility for generative AI: whether the site has an llms.txt file, whether robots.txt lets search bots such as OAI-SearchBot or PerplexityBot through, and whether it is possible to verify who is behind the site.',
      },
      {
        q: 'How is the overall score calculated?',
        a: 'Every check has a status (fine / could be better / missing) and a weight based on severity. A category score is their weighted average, and the overall score is a weighted average of the categories — SEO 30%, speed 25% combined, AEO, GEO and Soundness 15% each. Measurable metrics such as LCP or CLS are not converted in hard steps but continuously, so even a small improvement shows up.',
      },
      {
        q: 'Why does a category sometimes show a dash instead of a number?',
        a: 'When too few checks in a category can be verified (typically when a PageSpeed Insights measurement does not finish), a dash appears. A number computed from the two remaining checks would look trustworthy while saying nothing. Such a category is left out of the overall score, and the report offers a button to run the missing measurement.',
      },
      {
        q: 'Why is speed measured separately for mobile and desktop?',
        a: 'The results routinely differ by tens of points — a page can be brisk on desktop and crawl on a phone. Google also indexes mobile-first, so the mobile value carries more weight. The browser requests both measurements separately and runs them in parallel, because Lighthouse at Google is the slowest part of the whole audit. The report appears only once both results are in.',
      },
      {
        q: 'What is a “fatal finding” and why does it cap the score?',
        a: 'A noindex directive, a site-wide crawl ban in robots.txt, missing HTTPS or an error response from the server all mean the site is effectively absent from search. Without a cap such a site could still score 90 because the other checks pass. The score is therefore capped at 35 points and a red warning appears above the report.',
      },
      {
        q: 'Does the audit see content loaded by JavaScript?',
        a: 'No. The audit works with the downloaded HTML and does not launch a browser. On sites that generate content in the browser (SPAs) it may not see the text, headings or links. If a page looks that way, the report flags it in the measurement notes. The speed section is unaffected — Google measures that with its own browser.',
      },
      {
        q: 'Are the recommendations generated by AI?',
        a: 'No. All the text is pre-written and selected by the outcome of a specific check. When you see a recommendation for LCP, it is the same text every site in the same value range receives. That makes the advice consistent, verifiable, and impossible for the tool to invent.',
      },
      {
        q: 'Are audit results stored?',
        a: 'No. Nothing is saved to a database or a history — the audit is recomputed on every request and the result exists only in your browser. If you want to keep a report, save the page or print it to PDF.',
      },
    ],
  },

  cta: {
    title: 'All that is left is the address.',
    text:
      'The audit takes about a minute, a little longer on slower sites, and nothing is stored. Feel free ' +
      'to run it on a competitor — all you need is a public URL.',
    button: 'Run an audit',
  },

  loading: {
    eyebrow: 'Audit in progress',
    elapsed: 'elapsed',
    seconds: 's',
    hint: {
      before: 'Both speed measurements run in parallel, each in its own request. On fast sites it is done ',
      fast: 'within a minute',
      after:
        '; on slower ones the measurement is retried and the wait can exceed two minutes. If even the ' +
        'retry is not enough, the report appears without it and the missing part can be measured with one button.',
    },
    steps: {
      page: {
        label: 'Fetching the page and companion files',
        hint: 'HTML, robots.txt, llms.txt, the sitemap and internal links.',
        checksDone: 'checks done',
      },
      mobile: 'Measuring speed on mobile',
      desktop: 'Measuring speed on desktop',
      speedHint:
        'Lighthouse at Google is measuring Core Web Vitals. Both devices run in parallel, each in its own request.',
      retryHint:
        '. attempt — the previous measurement did not finish in time. Google has computed it since, so this attempt is usually quick.',
      fieldData: 'real CrUX data',
      labData: 'lab measurement',
    },
    tips: [
      {
        tag: 'Speed',
        text: 'Give the largest above-the-fold image `fetchpriority="high"` and fixed dimensions. It speeds up LCP and cuts layout shift at the same time.',
      },
      {
        tag: 'AEO',
        text: 'Put an answer of under 50 words below each heading, details after. Those are exactly the passages AI assistants lift into answers.',
      },
      {
        tag: 'GEO',
        text: 'Blocking training bots while letting search bots through is a legitimate combination. Blocking both means no assistant will ever cite you.',
      },
      {
        tag: 'SEO',
        text: 'A title under 60 characters shows in full in the results. The most important keyword belongs at the start, the brand at the end.',
      },
      {
        tag: 'Technical',
        text: 'Without `<meta name="viewport">` Google treats the page as not mobile-ready — and mobile is the primary device for indexing today.',
      },
      {
        tag: 'Content',
        text: 'Add `dateModified` to your JSON-LD and change it only on a real content edit. Assistants pick undated content as a source less willingly.',
      },
      {
        tag: 'Speed',
        text: 'A TTFB above 800 ms delays absolutely everything that follows. Page caching or a CDN is usually the cheapest improvement available.',
      },
      {
        tag: 'AEO',
        text: 'Steps and parameters belong in `<ol>` and `<table>`, not in prose. A structured block is far easier to cite than a paragraph.',
      },
    ],
  },

  report: {
    eyebrow: 'Audit result',
    total: 'overall',
    reset: 'New audit',
    summary: {
      great: 'The site is in good shape. What remains are details and upkeep.',
      good: 'The basics are solid. A few fixes will move it into the green.',
      average: 'The site works, but leaves a measurable share of performance and visibility on the table.',
      poor: 'Several fundamentals are missing. Start with the items marked in red.',
    },
    chips: {
      audit: 'audit',
      html: 'HTML',
      verified: '% of checks verified',
      ofCategories: 'categories',
      verifiedShort: '% verified',
      confidenceTitle: 'Share of checks that could be verified. Unverified ones do not count towards the score.',
    },
    blockers: {
      one: 'Fatal finding',
      many: 'Fatal findings',
      title: 'The site is effectively invisible to search engines',
      capBefore: 'While this holds, individual optimisations are pointless. The overall score is therefore capped at ',
      capAfter: ' points regardless of how the other checks turned out.',
    },
    missing: {
      eyebrow: 'Unfinished measurements',
      one: 'Speed on %s could not be measured.',
      both: 'Neither speed measurement could be completed.',
      explain:
        'Lighthouse at Google fails intermittently and another attempt after a moment usually goes ' +
        'through. Only the missing part is measured; the rest of the report stays as it is.',
      button: 'Measure %s speed',
      running: 'Measuring %s speed…',
      mobile: 'mobile',
      desktop: 'desktop',
    },
    issues: 'Start here',
    notes: 'Measurement notes',
  },

  category: {
    unscored: 'Not verified',
    pass: 'fine',
    warn: 'could be better',
    fail: 'missing',
    unknown: 'not verified',
    info: 'informational',
    infoTitle: 'Informational rows that do not affect the score.',
  },

  check: {
    status: {
      pass: 'Fine',
      warn: 'Could be better',
      fail: 'Missing',
      unknown: 'Not verified',
    },
    statePrefix: 'Status: ',
    notScored: '· not scored',
    notScoredTitle: 'This check is informational and does not affect the score.',
    error: 'error',
    bots: {
      search: 'Search / citing bots',
      searchHint: 'They decide whether an AI assistant may name you as a source.',
      training: 'Training bots',
      trainingHint: 'They collect data to train models. Blocking them is a legitimate choice.',
      allowed: 'allowed',
      disallowed: 'blocked',
      partial: 'partial',
      unmentioned: 'not mentioned',
      unknown: 'not verified',
    },
  },

  footer: {
    aria: 'Footer',
    tagline:
      'A rule-driven audit of speed, SEO, AEO, GEO and technical health. Every recommendation is ' +
      'pre-written and tied to a specific check — nothing is generated by a language model.',
    facts: [
      { label: 'Checks', value: '30+' },
      { label: 'Categories', value: '6' },
      { label: 'Data stored', value: '0' },
    ],
    contents: 'Contents',
    sources: 'Data sources',
    noteLeft: 'The audit is recomputed on every request and nothing is stored.',
    noteRight: 'Measured for mobile and desktop · Google’s data can differ between runs.',
    credit: 'Built and run by Semakod',
    copyright: '© 2026 Semakod · Mykola Stoyka · IČO 01796763',
    cookieSettings: 'Cookie settings',
  },

  cookie: {
    text: 'We use optional analytics (Google Tag Manager) to see how the audit is doing. Nothing is stored without consent, and analytics never loads without it.',
    accept: 'Accept',
    reject: 'Reject',
  },

  errors: {
    network: 'Could not reach the server.',
    networkDetail: 'Check your connection and try running the audit again.',
    generic: 'The audit could not be completed.',
  },

  notFound: {
    code: '404',
    title: 'This page does not exist.',
    text: 'The address either never existed or has moved. Try running an audit, or take a look at what Semakod does.',
    backHome: 'Back to the audit',
    visitSemakod: 'Visit semakod.cz',
    browseServices: 'Browse services',
  },
};

const DICTS: Record<Locale, UiDict> = { cs, en };

export function ui(locale: Locale): UiDict {
  return DICTS[locale];
}
