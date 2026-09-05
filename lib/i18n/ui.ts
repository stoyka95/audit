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
  metaTitle: 'Audit webu zdarma — rychlost, SEO, AEO a GEO | Semakod',
  metaDescription:
    'Online kontrola webu zdarma a bez registrace. Vložte adresu a do dvou minut máte 35 měřených ' +
    'kontrol: Core Web Vitals, SEO, připravenost na odpovědi AI a technický stav — s konkrétními ' +
    'doporučeními a exportem do PDF.',

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
    // Nadpis je poskládaný ze tří kusů, protože se každý vykresluje jinak:
    // začátek běžnou barvou textu, „Google“ barvami Googlu, konec přechodem.
    titleBefore: 'Zjistěte, jak váš web vidí ',
    // Nezlomitelná mezera za „i“: jednopísmenná spojka nesmí zůstat na konci řádku.
    titleBetween: ' i\u00a0',
    titleAccent: 'umělá inteligence',
    lead:
      'Vložte adresu a nástroj projde přes padesát konkrétních kontrol — od Core Web Vitals přes ' +
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
      weight: '25 %',
      description: 'Základ indexovatelnosti a on-page signály, které rozhodují o pozici ve vyhledávání.',
      items: ['noindex', 'Title', 'H1', 'Canonical', 'Open Graph', 'robots.txt', 'Sitemapa'],
    },
    {
      title: 'AEO',
      weight: '12 %',
      description: 'Připravenost obsahu na to, aby z něj šla vytáhnout přímá odpověď.',
      items: ['FAQ / HowTo schéma', 'Otázkové nadpisy', 'Přímá odpověď', 'Délka odstavců'],
    },
    {
      title: 'GEO',
      weight: '13 %',
      description: 'Viditelnost pro generativní AI a pravidla pro boty, které vás mohou citovat.',
      items: ['llms.txt', 'AI boti', 'Entitní profily', 'Kontakt a autor', 'Aktuálnost obsahu'],
    },
    {
      title: 'Správnost',
      weight: '13 %',
      description: 'Technický stav a spolehlivost — věci, které tiše kazí zážitek i procházení.',
      items: ['Viewport', 'Favicon', 'Vlastní 404', 'HSTS', 'Rozbité odkazy'],
    },
    {
      title: 'Přístupnost',
      weight: '12 %',
      description: 'Použitelnost pro klávesnici a čtečky obrazovky — čím dál častěji i zákonná povinnost.',
      items: ['Landmarky', 'Popisky formulářů', 'Přístupné názvy', 'Pořadí tabulátoru'],
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
    title: 'Přes padesát kontrol v šesti oblastech',
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
        a: 'Každá kontrola má stav (v pořádku / ke zlepšení / chybí) a váhu podle závažnosti. Skóre kategorie je jejich vážený průměr, celkové skóre pak vážený průměr kategorií — SEO 25 %, rychlost dohromady 25 %, GEO a Správnost po 13 %, AEO a Přístupnost po 12 %. Měřitelné metriky jako LCP nebo CLS se nepřevádějí natvrdo, ale plynule, takže i malé zlepšení je ve skóre vidět.',
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

  pdf: {
    button: 'Uložit do PDF',
    /** %s = auditovaná adresa */
    docTitle: 'Audit webu — %s',
    print: 'Uložit jako PDF',
    printHint:
      'V dialogu tisku zvolte cíl „Uložit jako PDF“ a vypněte volbu Záhlaví a zápatí — ' +
      'jinak prohlížeč dotiskne na každou stránku datum a adresu.',
    subtitle: 'Rychlost, SEO, AEO, GEO, technický stav a přístupnost',
    eyebrow: 'Výsledek auditu',
    generated: 'Vytvořeno',
    overall: 'Celkové skóre',
    summary: {
      fail: 'Chybí',
      warn: 'Ke zlepšení',
      pass: 'V pořádku',
      note: 'Z bodovaných kontrol',
    },
    categories: 'Skóre kategorií',
    blockers: 'Fatální nálezy',
    recommendations: 'Doporučení',
    recommendationsLead:
      'Seřazeno podle váhy ve skóre — nahoře je to, co s výsledkem udělá nejvíc. Texty jsou předem ' +
      'napsané a vybrané podle naměřené hodnoty, nic z nich negeneruje jazykový model.',
    noRecommendations: 'Žádná doporučení. Všechny bodované kontroly prošly.',
    passed: 'Prošlo bez připomínek',
    notes: 'Poznámky k měření',
    weight: 'váha',
    measured: 'Naměřeno',
    unscored: 'neověřeno',
    footer:
      'Report vytvořil nástroj Audit webu (audit.semakod.cz) od Semakod. Audit se nikam neukládá — ' +
      'tenhle dokument je jeho jediná kopie.',
    popupBlocked:
      'Prohlížeč zablokoval otevření nového okna. Povolte pro tuhle stránku vyskakovací okna a zkuste to znovu.',
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
      'Pravidly řízený audit rychlosti, SEO, AEO, GEO, technického stavu a přístupnosti. Všechna ' +
      'doporučení jsou předem napsaná a navázaná na konkrétní kontrolu — nic negeneruje jazykový model.',
    facts: {
      audits: {
        label: 'Auditů',
        hint: 'Skutečný počet dokončených auditů, zaokrouhlený dolů.',
      },
      people: {
        label: 'Lidí',
        hint:
          'Kolik různých návštěvníků audit spustilo. Odhad z jednosměrného otisku, ' +
          'který se nikde neukládá.',
      },
      categories: {
        label: 'Kategorií',
        hint:
          'Pět oblastí auditu (SEO, AEO, GEO, Správnost, Přístupnost) a rychlost hodnocená zvlášť ' +
          'pro mobil a pro počítač — dohromady sedm kategorií v jednom reportu.',
      },
      stored: { label: 'Uložených dat', value: '0' },
    },
    contents: 'Obsah',
    sources: 'Zdroje dat',
    links: 'Odkazy',
    services: 'Služby Semakod',
    noteLeft: 'Audit se počítá při každém požadavku znovu a nikam se neukládá.',
    noteRight: 'Měřeno pro mobil i pro počítač · data z Googlu se mohou mezi běhy lišit.',
    credit: 'Vytvořil a provozuje Semakod',
    copyright: '© 2026 Semakod · Mykola Stoyka · IČO 01796763',
    cookieSettings: 'Nastavení cookies',
  },

  cookie: {
    /* ---------- lišta ---------- */
    aria: 'Souhlas s cookies',
    title: 'Cookies a soukromí',
    text:
      'Tenhle web sám žádné cookies nenastavuje. Volitelně umí načíst Google Tag Manager s Google ' +
      'Analytics 4, aby bylo vidět, kolik lidí audit používá — teprve ten ukládá cookies do vašeho ' +
      'prohlížeče. Bez souhlasu se nenačte vůbec a odmítnutí je stejně rychlé jako souhlas.',
    accept: 'Přijmout',
    reject: 'Odmítnout',
    more: 'Více o cookies',

    /* ---------- modální okno ---------- */
    modal: {
      title: 'Cookies a zpracování údajů',
      lead:
        'Co se při návštěvě ukládá, kdo to zpracovává, na jak dlouho a co s tím můžete udělat. ' +
        'Sepsané podle GDPR a § 89 odst. 3 zákona č. 127/2005 Sb., o elektronických komunikacích.',
      updated: 'Znění platné od ledna 2026',
      close: 'Zavřít',
      save: 'Uložit volbu',
      acceptAll: 'Přijmout vše',
      rejectAll: 'Odmítnout vše',
      alwaysOn: 'Vždy aktivní',
      optional: 'Volitelné',
      enabled: 'Zapnuto',
      disabled: 'Vypnuto',
      choiceLabel: 'Analytické cookies',
      tableHead: {
        name: 'Název',
        provider: 'Zpracovatel',
        purpose: 'Účel',
        expiry: 'Doba uložení',
      },
      groups: [
        {
          id: 'necessary',
          title: 'Nezbytné',
          required: true,
          text:
            'Technicky vzato nejde o cookies, ale o tři položky v úložišti prohlížeče (localStorage). ' +
            'Nikam se neposílají — zůstávají ve vašem zařízení a server je nikdy nevidí. Bez nich by web ' +
            'zapomněl motiv, jazyk i vaši volbu na téhle liště, takže na ně souhlas podle zákona není potřeba.',
          rows: [
            {
              name: 'theme',
              provider: 'audit.semakod.cz',
              purpose: 'Světlý nebo tmavý režim',
              expiry: 'Do smazání dat prohlížeče',
            },
            {
              name: 'locale',
              provider: 'audit.semakod.cz',
              purpose: 'Zvolený jazyk rozhraní',
              expiry: 'Do smazání dat prohlížeče',
            },
            {
              name: 'cookie-consent',
              provider: 'audit.semakod.cz',
              purpose: 'Vaše volba na téhle liště, ať se neptáme při každé návštěvě',
              expiry: '12 měsíců',
            },
          ],
        },
        {
          id: 'analytics',
          title: 'Analytické',
          required: false,
          text:
            'Google Tag Manager, který načte Google Analytics 4. Zajímá nás jen souhrn: kolik auditů se ' +
            'spustí, odkud lidé přicházejí a kde ze stránky odcházejí. Adresy, které auditujete, ani ' +
            'výsledky auditů se do analytiky neposílají. Bez souhlasu se skript vůbec nestáhne — nejde ' +
            'o načtení „na později", ale o žádné načtení.',
          rows: [
            {
              name: '_ga',
              provider: 'Google Ireland Limited',
              purpose: 'Odliší vracejícího se návštěvníka od nového',
              expiry: '2 roky',
            },
            {
              name: '_ga_*',
              provider: 'Google Ireland Limited',
              purpose: 'Drží stav jedné návštěvy (session)',
              expiry: '2 roky',
            },
            {
              name: '_gid',
              provider: 'Google Ireland Limited',
              purpose: 'Odliší zařízení v rámci jednoho dne',
              expiry: '24 hodin',
            },
          ],
        },
      ],
      sections: [
        {
          title: 'Kdo údaje zpracovává',
          text:
            'Správcem je Mykola Stoyka — Semakod, IČO 01796763, provozovatel audit.semakod.cz. ' +
            'Analytiku jako zpracovatel zajišťuje Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irsko. ' +
            'Kontakt na správce najdete na semakod.cz.',
        },
        {
          title: 'Právní základ',
          text:
            'Analytické cookies ukládáme jen na základě vašeho souhlasu podle čl. 6 odst. 1 písm. a) GDPR ' +
            'a § 89 odst. 3 zákona č. 127/2005 Sb. Souhlas je dobrovolný: bez něj funguje audit úplně stejně, ' +
            'nic se neomezuje. Nezbytné položky v úložišti prohlížeče souhlas nevyžadují.',
        },
        {
          title: 'Předávání mimo EU',
          text:
            'Google může údaje zpracovávat i na serverech mimo Evropskou unii. Podkladem je rozhodnutí ' +
            'Evropské komise o odpovídající ochraně (rámec EU–US Data Privacy Framework) doplněné o ' +
            'standardní smluvní doložky. Bez souhlasu s analytikou se ven neposílá nic.',
        },
        {
          title: 'Jak dlouho souhlas platí',
          text:
            'Vaši volbu si pamatujeme dvanáct měsíců. Pak se zeptáme znovu — souhlas z roku 2025 nemá ' +
            'platit napořád. Kdykoli mezitím ho můžete změnit odkazem „Nastavení cookies" v patičce.',
        },
        {
          title: 'Co tady nenajdete',
          text:
            'Žádné reklamní ani profilovací cookies, žádné sledování napříč weby, žádný prodej ani ' +
            'předávání údajů dalším stranám. Samotný audit se nikam neukládá: počítá se při každém ' +
            'požadavku znovu a po odeslání odpovědi z paměti mizí. Vedeme jen dvě anonymní čísla — ' +
            'kolik auditů proběhlo a kolik různých lidí je spustilo. To druhé se počítá z jednosměrného ' +
            'otisku IP adresy a prohlížeče, který se nikde neukládá: do počítadla jde jen ' +
            'pravděpodobnostní náčrt, ze kterého nejde zpětně přečíst vůbec nic.',
        },
        {
          title: 'Vaše práva',
          text:
            'Máte právo na přístup k údajům, opravu, výmaz, omezení zpracování, přenositelnost a právo ' +
            'vznést námitku. Souhlas můžete kdykoli odvolat, aniž by to ovlivnilo zákonnost zpracování ' +
            'před odvoláním. Stěžovat si můžete u Úřadu pro ochranu osobních údajů (uoou.gov.cz).',
        },
      ],
    },
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
  metaTitle: 'Free site audit — speed, SEO, AEO and GEO | Semakod',
  metaDescription:
    'A free website check with no sign-up. Enter an address and within two minutes you get 35 measured ' +
    'checks: Core Web Vitals, SEO, readiness for AI answers and technical health — with concrete ' +
    'recommendations and a PDF export.',

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
    titleBefore: 'See how your site looks to ',
    titleBetween: ' and\u00a0to ',
    titleAccent: 'AI',
    lead:
      'Enter an address and the tool runs more than fifty concrete checks — from Core Web Vitals ' +
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
      weight: '25%',
      description: 'Indexability basics and the on-page signals that decide your position in search.',
      items: ['noindex', 'Title', 'H1', 'Canonical', 'Open Graph', 'robots.txt', 'Sitemap'],
    },
    {
      title: 'AEO',
      weight: '12%',
      description: 'How ready the content is for a direct answer to be extracted from it.',
      items: ['FAQ / HowTo schema', 'Question headings', 'Direct answer', 'Paragraph length'],
    },
    {
      title: 'GEO',
      weight: '13%',
      description: 'Visibility for generative AI and rules for the bots that may cite you.',
      items: ['llms.txt', 'AI bots', 'Entity profiles', 'Contact & author', 'Content freshness'],
    },
    {
      title: 'Soundness',
      weight: '13%',
      description: 'Technical health and reliability — the things that quietly spoil both browsing and crawling.',
      items: ['Viewport', 'Favicon', 'Custom 404', 'HSTS', 'Broken links'],
    },
    {
      title: 'Accessibility',
      weight: '12%',
      description: 'Usability for keyboards and screen readers — increasingly a legal requirement too.',
      items: ['Landmarks', 'Form labels', 'Accessible names', 'Tab order'],
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
    title: 'Over fifty checks across six areas',
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
        a: 'Every check has a status (fine / could be better / missing) and a weight based on severity. A category score is their weighted average, and the overall score is a weighted average of the categories — SEO 25%, speed 25% combined, GEO and Soundness 13% each, AEO and Accessibility 12% each. Measurable metrics such as LCP or CLS are not converted in hard steps but continuously, so even a small improvement shows up.',
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

  pdf: {
    button: 'Save as PDF',
    docTitle: 'Site audit — %s',
    print: 'Save as PDF',
    printHint:
      'In the print dialog pick “Save as PDF” as the destination and turn off Headers and footers — ' +
      'otherwise the browser prints the date and the address onto every page.',
    subtitle: 'Speed, SEO, AEO, GEO, technical health and accessibility',
    eyebrow: 'Audit result',
    generated: 'Created',
    overall: 'Overall score',
    summary: {
      fail: 'Missing',
      warn: 'Could be better',
      pass: 'Fine',
      note: 'Of the scored checks',
    },
    categories: 'Category scores',
    blockers: 'Fatal findings',
    recommendations: 'Recommendations',
    recommendationsLead:
      'Ordered by weight in the score — what makes the biggest difference comes first. The texts are ' +
      'pre-written and picked by the measured value; none of them is generated by a language model.',
    noRecommendations: 'No recommendations. Every scored check passed.',
    passed: 'Passed without remarks',
    notes: 'Measurement notes',
    weight: 'weight',
    measured: 'Measured',
    unscored: 'not verified',
    footer:
      'This report was produced by Site Audit (audit.semakod.cz) by Semakod. The audit is never stored — ' +
      'this document is its only copy.',
    popupBlocked:
      'The browser blocked the new window. Allow pop-ups for this page and try again.',
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
      'A rule-driven audit of speed, SEO, AEO, GEO, technical health and accessibility. Every ' +
      'recommendation is pre-written and tied to a specific check — nothing is generated by a language model.',
    facts: {
      audits: {
        label: 'Audits',
        hint: 'The real number of completed audits, rounded down.',
      },
      people: {
        label: 'People',
        hint:
          'How many different visitors have run an audit. Estimated from a one-way fingerprint ' +
          'that is never stored.',
      },
      categories: {
        label: 'Categories',
        hint:
          'Five audit areas (SEO, AEO, GEO, Soundness, Accessibility) plus speed scored separately ' +
          'for mobile and desktop — seven categories in one report.',
      },
      stored: { label: 'Data stored', value: '0' },
    },
    contents: 'Contents',
    sources: 'Data sources',
    links: 'Links',
    services: 'Semakod services',
    noteLeft: 'The audit is recomputed on every request and nothing is stored.',
    noteRight: 'Measured for mobile and desktop · Google’s data can differ between runs.',
    credit: 'Built and run by Semakod',
    copyright: '© 2026 Semakod · Mykola Stoyka · IČO 01796763',
    cookieSettings: 'Cookie settings',
  },

  cookie: {
    /* ---------- banner ---------- */
    aria: 'Cookie consent',
    title: 'Cookies and privacy',
    text:
      'This site sets no cookies of its own. Optionally it can load Google Tag Manager with Google ' +
      'Analytics 4 so we can see how many people use the audit — that is what stores cookies in your ' +
      'browser. Without consent it never loads, and rejecting takes exactly as long as accepting.',
    accept: 'Accept',
    reject: 'Reject',
    more: 'More about cookies',

    /* ---------- modal ---------- */
    modal: {
      title: 'Cookies and data processing',
      lead:
        'What gets stored during your visit, who processes it, for how long and what you can do about it. ' +
        'Written up under the GDPR and § 89(3) of Czech Act No. 127/2005 Coll. on electronic communications.',
      updated: 'Version effective January 2026',
      close: 'Close',
      save: 'Save choice',
      acceptAll: 'Accept all',
      rejectAll: 'Reject all',
      alwaysOn: 'Always on',
      optional: 'Optional',
      enabled: 'On',
      disabled: 'Off',
      choiceLabel: 'Analytics cookies',
      tableHead: {
        name: 'Name',
        provider: 'Processor',
        purpose: 'Purpose',
        expiry: 'Retention',
      },
      groups: [
        {
          id: 'necessary',
          title: 'Strictly necessary',
          required: true,
          text:
            'Technically these are not cookies but three entries in browser storage (localStorage). ' +
            'They are never sent anywhere — they stay on your device and the server never sees them. ' +
            'Without them the site would forget your theme, your language and your choice on this banner, ' +
            'so the law does not require consent for them.',
          rows: [
            {
              name: 'theme',
              provider: 'audit.semakod.cz',
              purpose: 'Light or dark mode',
              expiry: 'Until browser data is cleared',
            },
            {
              name: 'locale',
              provider: 'audit.semakod.cz',
              purpose: 'Selected interface language',
              expiry: 'Until browser data is cleared',
            },
            {
              name: 'cookie-consent',
              provider: 'audit.semakod.cz',
              purpose: 'Your choice on this banner, so we stop asking on every visit',
              expiry: '12 months',
            },
          ],
        },
        {
          id: 'analytics',
          title: 'Analytics',
          required: false,
          text:
            'Google Tag Manager, which loads Google Analytics 4. We only care about the aggregate: how ' +
            'many audits get run, where people arrive from and where they leave. The addresses you audit ' +
            'and the audit results are never sent to analytics. Without consent the script is not ' +
            'downloaded at all — not deferred, simply never loaded.',
          rows: [
            {
              name: '_ga',
              provider: 'Google Ireland Limited',
              purpose: 'Tells a returning visitor from a new one',
              expiry: '2 years',
            },
            {
              name: '_ga_*',
              provider: 'Google Ireland Limited',
              purpose: 'Holds the state of a single session',
              expiry: '2 years',
            },
            {
              name: '_gid',
              provider: 'Google Ireland Limited',
              purpose: 'Tells devices apart within one day',
              expiry: '24 hours',
            },
          ],
        },
      ],
      sections: [
        {
          title: 'Who processes the data',
          text:
            'The controller is Mykola Stoyka — Semakod, Company ID 01796763, operator of audit.semakod.cz. ' +
            'Analytics is handled as a processor by Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. ' +
            'Contact details for the controller are on semakod.cz.',
        },
        {
          title: 'Legal basis',
          text:
            'Analytics cookies are stored solely on your consent under Art. 6(1)(a) GDPR and § 89(3) of ' +
            'Act No. 127/2005 Coll. Consent is voluntary: without it the audit works exactly the same and ' +
            'nothing is withheld. The strictly necessary browser-storage entries require no consent.',
        },
        {
          title: 'Transfers outside the EU',
          text:
            'Google may process data on servers outside the European Union. The basis is the European ' +
            'Commission adequacy decision (the EU–US Data Privacy Framework) together with standard ' +
            'contractual clauses. Without consent to analytics, nothing leaves at all.',
        },
        {
          title: 'How long consent lasts',
          text:
            'We remember your choice for twelve months, then ask again — consent given in 2025 should not ' +
            'hold forever. You can change it at any point through “Cookie settings” in the footer.',
        },
        {
          title: 'What you will not find here',
          text:
            'No advertising or profiling cookies, no cross-site tracking, no selling or passing data on to ' +
            'third parties. The audit itself is never stored: it is recomputed on every request and leaves ' +
            'memory once the response is sent. We keep just two anonymous numbers — how many audits have ' +
            'run and how many different people have run them. The second comes from a one-way fingerprint ' +
            'of the IP address and browser that is never stored: only a probabilistic sketch reaches the ' +
            'counter, and nothing at all can be read back out of it.',
        },
        {
          title: 'Your rights',
          text:
            'You have the right of access, rectification, erasure, restriction of processing, data ' +
            'portability and the right to object. You may withdraw consent at any time without affecting ' +
            'the lawfulness of processing before the withdrawal. Complaints go to the Czech Data ' +
            'Protection Authority (uoou.gov.cz).',
        },
      ],
    },
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
