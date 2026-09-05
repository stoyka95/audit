import { formatDecimal, formatMs, formatSeconds } from '../format';
import { translator } from '../i18n';
import { ramp, type RampAnchors } from '../scoring';
import type { AuditContext, CheckResult, PsiStrategy } from '../types';

/**
 * Kotvy pro spojité skóre. `good` a `poor` se musí shodovat s hranicemi stavů
 * níž, jinak by si barva a číslo odporovaly. `zero` je hodnota, u které už
 * nemá smysl rozlišovat „špatné" a „ještě horší".
 */
const ANCHORS = {
  lcp: { good: 2500, poor: 4000, zero: 8000 },
  cls: { good: 0.1, poor: 0.25, zero: 0.6 },
  ttfb: { good: 800, poor: 1800, zero: 5000 },
  inp: { good: 200, poor: 500, zero: 1500 },
  tbt: { good: 200, poor: 600, zero: 2000 },
  /** Aplikuje se na `100 − skóre`, protože ramp počítá „menší = lepší". */
  perfGap: { good: 10, poor: 50, zero: 100 },
} satisfies Record<string, RampAnchors>;

/**
 * Kontroly rychlosti pro jedno zařízení. Mobil a počítač měří PageSpeed zvlášť
 * a výsledky se běžně liší o desítky bodů — jeden společný údaj by zakrýval,
 * na kterém zařízení je problém.
 *
 * TTFB je vlastnost serveru, ne zařízení: měříme ho jednou z vlastního
 * požadavku, boduje se u mobilu a u počítače se neopakuje.
 */
export function speedChecks(ctx: AuditContext, strategy: PsiStrategy): CheckResult[] {
  const t = translator(ctx.locale);
  const psi = strategy === 'mobile' ? ctx.psiMobile : ctx.psiDesktop;
  const { page, locale } = ctx;
  const isMobile = strategy === 'mobile';
  const device = isMobile ? t('mobil', 'mobile') : t('počítač', 'desktop');
  const checks: CheckResult[] = [];

  const unavailable = psi.pending
    ? t(
        'Měření právě probíhá v samostatném požadavku. Lighthouse na straně Googlu je nejpomalejší část ' +
          'auditu, proto má mobil i počítač vlastní požadavek s vlastním časovým rozpočtem — jinak by si ' +
          'navzájem braly čas a jedno z nich by pravidelně nedoběhlo.',
        'The measurement is running in a separate request. Lighthouse on Google’s side is by far the ' +
          'slowest part of the audit, so mobile and desktop each get their own request with their own time ' +
          'budget — sharing one budget meant that one of them regularly failed to finish.',
      )
    : t(
        'Rychlostní metriku se nepodařilo změřit — PageSpeed Insights neodpovědělo nebo odmítlo požadavek. ' +
          'Zkuste audit spustit znovu za chvíli, případně doplňte vlastní API klíč pro vyšší limit volání.',
        'This speed metric could not be measured — PageSpeed Insights did not respond or rejected the ' +
          'request. Try running the audit again in a moment, or add your own API key for a higher call limit.',
      );

  const unavailableValue = psi.pending
    ? t('probíhá měření', 'measuring')
    : t('nepodařilo se ověřit', 'could not verify');

  /* --- Celkové Performance skóre --- */
  const perfLabel = t(
    `Performance skóre (PageSpeed, ${device})`,
    `Performance score (PageSpeed, ${device})`,
  );

  if (psi.available && psi.performanceScore !== null) {
    const score = psi.performanceScore;
    checks.push({
      id: 'psi-performance',
      label: perfLabel,
      // Váha 1 (proti 3 u LCP): skóre se s ostatními metrikami částečně
      // překrývá, ale zahrnuje i FCP, Speed Index a TBT, které samostatně
      // neměříme. Bez něj mohla kategorie hlásit 100, zatímco Lighthouse
      // ukazoval 58 — právě kvůli metrikám, které v reportu nejsou.
      status: score >= 90 ? 'pass' : score >= 50 ? 'warn' : 'fail',
      score: ramp(100 - score, ANCHORS.perfGap),
      value: `${score}/100`,
      weight: 1,
      featured: true,
      detail:
        score >= 90
          ? t(
              'Laboratorní skóre výkonu je v zeleném pásmu. Stránka se načítá rychle a nic zásadního nebrzdí vykreslení. Udržujte tento stav kontrolou při každém větším nasazení.',
              'The lab performance score is in the green band. The page loads quickly and nothing substantial is holding back rendering. Keep it that way by re-checking after every larger release.',
            )
          : score >= 50
            ? t(
                'Výkon je průměrný — návštěvníci na pomalejším připojení budou čekat déle, než je potřeba. Zaměřte se na zmenšení obrázků, odložení nepodstatných skriptů a odstranění blokujícího CSS. Největší přínos mívá optimalizace hlavního obrázku a fontů.',
                'Performance is mediocre — visitors on slower connections wait longer than they need to. Focus on shrinking images, deferring non-essential scripts and removing render-blocking CSS. Optimising the hero image and the fonts usually gives the biggest win.',
              )
            : t(
                'Výkon je slabý a přímo poškozuje konverze i pozice ve vyhledávání. Začněte u největších brzd: komprese a moderní formáty obrázků (WebP/AVIF), odložení marketingových skriptů pod `defer`, a omezení nepoužívaného JavaScriptu. Zlepšení tohoto čísla se projeví napříč všemi ostatními metrikami.',
                'Performance is poor and it directly costs you conversions and search rankings. Start with the biggest brakes: image compression and modern formats (WebP/AVIF), moving marketing scripts behind `defer`, and cutting unused JavaScript. Improving this number lifts every other metric with it.',
              ),
    });
  } else {
    checks.push({
      id: 'psi-performance',
      label: perfLabel,
      status: 'unknown',
      value: unavailableValue,
      weight: 1,
      featured: true,
      detail: unavailable,
    });
  }

  /* --- LCP --- */
  const lcpLabel = t('LCP — vykreslení hlavního obsahu', 'LCP — largest contentful paint');
  if (psi.available && psi.lcpMs !== null) {
    const lcp = psi.lcpMs;
    checks.push({
      id: 'lcp',
      label: lcpLabel,
      status: lcp <= 2500 ? 'pass' : lcp <= 4000 ? 'warn' : 'fail',
      score: ramp(lcp, ANCHORS.lcp),
      value: formatSeconds(lcp, locale),
      weight: 3,
      detail:
        lcp <= 2500
          ? t(
              'Hlavní obsah stránky se vykreslí do 2,5 sekundy, což Google hodnotí jako dobré. Návštěvník vidí podstatnou část stránky prakticky okamžitě. Hlídejte to hlavně po přidání nových bannerů a obrázků nad ohybem.',
              'The main content renders within 2.5 seconds, which Google rates as good. Visitors see a substantial part of the page almost immediately. Watch this after adding new banners or above-the-fold images.',
            )
          : lcp <= 4000
            ? t(
                'Hlavní obsah se vykresluje pomaleji, než je doporučených 2,5 sekundy. Nejčastější příčinou je velký nekomprimovaný obrázek nad ohybem nebo pomalá odpověď serveru. Přidejte hlavnímu obrázku `fetchpriority="high"`, zmenšete ho a přednačtěte kritický font.',
                'The main content takes longer than the recommended 2.5 seconds. The usual cause is a large uncompressed image above the fold or a slow server response. Give the hero image `fetchpriority="high"`, shrink it, and preload the critical font.',
              )
            : t(
                'Hlavní obsah se vykresluje déle než 4 sekundy — to je hodnoceno jako špatné a řada návštěvníků odejde dřív, než stránku uvidí. Zkontrolujte velikost hlavního obrázku, zapněte CDN a odstraňte render-blocking CSS a JS z hlavičky. Toto je nejdůležitější rychlostní metrika, kterou máte opravit.',
                'The main content takes over 4 seconds to render — that is rated poor, and many visitors leave before they see anything. Check the size of the hero image, put a CDN in front, and remove render-blocking CSS and JS from the head. This is the single most important speed metric to fix.',
              ),
    });
  } else {
    checks.push({
      id: 'lcp',
      label: lcpLabel,
      status: 'unknown',
      value: unavailableValue,
      weight: 3,
      detail: unavailable,
    });
  }

  /* --- INP (field data) s fallbackem na TBT (lab) --- */
  if (psi.available && psi.inpMs !== null) {
    const inp = psi.inpMs;
    checks.push({
      id: 'inp',
      label: t('INP — odezva na interakci (reálná data)', 'INP — interaction to next paint (field data)'),
      status: inp <= 200 ? 'pass' : inp <= 500 ? 'warn' : 'fail',
      score: ramp(inp, ANCHORS.inp),
      value: formatMs(inp),
      weight: 2,
      detail:
        inp <= 200
          ? t(
              'Stránka reaguje na kliknutí a psaní do 200 ms, což uživatel vnímá jako okamžitou odezvu. Hodnota pochází z reálných měření návštěvníků v Chrome. Držte JavaScript v hlavním vlákně krátký a stav zůstane dobrý.',
              'The page responds to clicks and typing within 200 ms, which users perceive as instant. The value comes from real Chrome users. Keep main-thread JavaScript short and it will stay that way.',
            )
          : inp <= 500
            ? t(
                'Odezva na interakci je pomalejší, než je doporučených 200 ms. Obvykle za to může dlouhá úloha v hlavním vlákně — velké event handlery, těžké překreslování nebo analytické skripty. Rozdělte dlouhé úlohy a odložte nepodstatné skripty na dobu nečinnosti.',
                'Interaction latency is above the recommended 200 ms. The usual culprit is a long main-thread task — heavy event handlers, expensive re-rendering or analytics scripts. Break up long tasks and defer non-essential scripts to idle time.',
              )
            : t(
                'Stránka reaguje na kliknutí se zpožděním přes půl sekundy, což působí jako zamrznutí. Najděte dlouhé úlohy v panelu Performance a rozdělte je, případně přesuňte výpočty do Web Workeru. Omezte také počet skriptů třetích stran běžících při interakci.',
                'The page takes over half a second to respond to a click, which feels like a freeze. Find the long tasks in the Performance panel and split them, or move the work into a Web Worker. Cut back on third-party scripts running during interaction.',
              ),
    });
  } else if (psi.available && psi.tbtMs !== null) {
    const tbt = psi.tbtMs;
    checks.push({
      id: 'inp',
      label: t(
        'TBT — blokování hlavního vlákna (náhrada za INP)',
        'TBT — total blocking time (stand-in for INP)',
      ),
      status: tbt <= 200 ? 'pass' : tbt <= 600 ? 'warn' : 'fail',
      score: ramp(tbt, ANCHORS.tbt),
      value: formatMs(tbt),
      weight: 2,
      detail:
        tbt <= 200
          ? t(
              'Pro tuto stránku nejsou dostupná reálná data INP, proto se hodnotí laboratorní TBT. Hlavní vlákno je blokované jen krátce, takže stránka bude na interakce reagovat svižně. Reálné INP si po nasazení ověřte v Search Console.',
              'No real-user INP data exists for this page, so lab TBT is used instead. The main thread is only briefly blocked, so the page should feel responsive. Check the real INP in Search Console once you have traffic.',
            )
          : tbt <= 600
            ? t(
                'Reálná data INP nejsou k dispozici, hodnotí se laboratorní TBT. Hlavní vlákno je blokované střední dobu, což se projeví jako drobné zaseknutí při prvních kliknutích. Odložte skripty třetích stran a zmenšete objem JavaScriptu načítaného při startu.',
                'No real-user INP data is available, so lab TBT is used. The main thread is moderately blocked, which shows up as small stutters on the first clicks. Defer third-party scripts and cut the JavaScript loaded at startup.',
              )
            : t(
                'Reálná data INP nejsou k dispozici, hodnotí se laboratorní TBT — a ten je vysoký. Hlavní vlákno je dlouho zablokované, takže stránka po načtení nereaguje. Odstraňte nepoužívaný JavaScript, odložte marketingové skripty a rozdělte dlouhé úlohy.',
                'No real-user INP data is available, so lab TBT is used — and it is high. The main thread is blocked for a long time, so the page does not respond right after loading. Remove unused JavaScript, defer marketing scripts and split long tasks.',
              ),
    });
  } else {
    checks.push({
      id: 'inp',
      label: t('INP — odezva na interakci', 'INP — interaction to next paint'),
      status: 'unknown',
      value: unavailableValue,
      weight: 2,
      detail: unavailable,
    });
  }

  /* --- TBT jako samostatný řádek, když INP přišlo z reálných dat --- */
  // Když se INP vzalo z Chrome UX Reportu, TBT výš vůbec nezaznělo — a přitom
  // má v Lighthouse skóre největší váhu ze všech metrik. Tady vznikal rozpor,
  // kdy kategorie hlásila 100 a Lighthouse vedle toho 58: zablokované hlavní
  // vlákno se do hodnocení nedostalo. Váha 1, protože s INP se částečně kryje.
  if (psi.available && psi.inpMs !== null && psi.tbtMs !== null) {
    const tbt = psi.tbtMs;
    checks.push({
      id: 'tbt',
      label: t('TBT — blokování hlavního vlákna', 'TBT — total blocking time'),
      status: tbt <= 200 ? 'pass' : tbt <= 600 ? 'warn' : 'fail',
      score: ramp(tbt, ANCHORS.tbt),
      value: formatMs(tbt),
      weight: 1,
      detail:
        tbt <= 200
          ? t(
              'Hlavní vlákno je při načítání blokované jen krátce, takže stránka je použitelná prakticky okamžitě po vykreslení. Reálné INP výš to potvrzuje z pohledu skutečných návštěvníků. Tenhle stav udržíte tím, že nové skripty budete přidávat s `defer` a nebudete rozšiřovat kód běžící při startu.',
              'The main thread is only briefly blocked during load, so the page is usable almost as soon as it renders. The real INP above confirms this from actual visitors. Keep it that way by adding new scripts with `defer` and not growing the startup code.',
            )
          : tbt <= 600
            ? t(
                'Hlavní vlákno je při načítání blokované déle, než by mělo. Reálná odezva na interakci je zatím v pořádku, protože návštěvníci obvykle kliknou až po dokončení načítání — ale ten, kdo klikne dřív, čeká. Odložte skripty třetích stran pod `defer` a zmenšete objem JavaScriptu načítaného při startu.',
                'The main thread is blocked longer than it should be during load. Real interaction latency is still fine because visitors usually click after loading finishes — but anyone who clicks earlier waits. Move third-party scripts behind `defer` and cut the JavaScript loaded at startup.',
              )
            : t(
                'Hlavní vlákno je při načítání dlouho zablokované. Právě tohle nejčastěji stahuje celkové Performance skóre dolů, i když LCP a CLS vycházejí dobře. Najděte dlouhé úlohy v panelu Performance, odstraňte nepoužívaný JavaScript a marketingové skripty načtěte až po vykreslení stránky.',
                'The main thread is blocked for a long time during load. This is the most common reason the overall Performance score stays low even when LCP and CLS look good. Find the long tasks in the Performance panel, remove unused JavaScript, and load marketing scripts after the page renders.',
              ),
    });
  }

  /* --- CLS --- */
  const clsLabel = t('CLS — vizuální stabilita layoutu', 'CLS — cumulative layout shift');
  if (psi.available && psi.clsValue !== null) {
    const cls = psi.clsValue;
    checks.push({
      id: 'cls',
      label: clsLabel,
      status: cls <= 0.1 ? 'pass' : cls <= 0.25 ? 'warn' : 'fail',
      score: ramp(cls, ANCHORS.cls),
      value: formatDecimal(cls, 3, locale),
      weight: 2,
      detail:
        cls <= 0.1
          ? t(
              'Layout je při načítání stabilní a obsah neposkakuje. Uživatel neklikne omylem na něco jiného, než chtěl. Při přidávání nových bannerů jim vždy rezervujte pevnou výšku.',
              'The layout is stable while loading and content does not jump around. Visitors will not click something other than what they aimed at. Always reserve a fixed height when adding new banners.',
            )
          : cls <= 0.25
            ? t(
                'Obsah se během načítání mírně posouvá. Typickou příčinou jsou obrázky bez atributů `width` a `height`, dodatečně načtené fonty nebo reklamní bloky bez rezervovaného místa. Doplňte rozměry médií a použijte `font-display: swap` s odpovídajícím fallback fontem.',
                'Content shifts slightly while loading. The usual causes are images without `width` and `height`, late-loading fonts, or ad slots with no reserved space. Add dimensions to media and use `font-display: swap` with a matching fallback font.',
              )
            : t(
                'Layout výrazně poskakuje a uživatel může kliknout na špatný prvek. Doplňte všem obrázkům a iframům pevné rozměry nebo `aspect-ratio`, rezervujte místo pro bannery a cookie lišty a nevkládejte obsah nad již vykreslený text.',
                'The layout jumps noticeably and visitors may click the wrong element. Give every image and iframe fixed dimensions or an `aspect-ratio`, reserve space for banners and cookie bars, and never insert content above already-rendered text.',
              ),
    });
  } else {
    checks.push({
      id: 'cls',
      label: clsLabel,
      status: 'unknown',
      value: unavailableValue,
      weight: 2,
      detail: unavailable,
    });
  }

  // TTFB je vlastnost serveru, ne zařízení. Měří se jednou a patří k mobilu;
  // u počítače by to byl jen zdvojený řádek se stejným číslem.
  if (!isMobile) return checks;

  /* --- TTFB z vlastního requestu --- */
  const ttfbLabel = t('TTFB — odezva serveru', 'TTFB — server response time');
  if (page.ttfbMs !== null) {
    const ttfb = page.ttfbMs;
    checks.push({
      id: 'ttfb',
      label: ttfbLabel,
      status: ttfb <= 800 ? 'pass' : ttfb <= 1800 ? 'warn' : 'fail',
      score: ramp(ttfb, ANCHORS.ttfb),
      value: formatMs(ttfb),
      weight: 2,
      detail:
        ttfb <= 800
          ? t(
              'Server odpověděl rychle, takže prohlížeč může okamžitě začít stavět stránku. Rychlý TTFB je základ, na kterém stojí i dobré LCP. Měřeno z jednoho požadavku, reálné hodnoty se mohou podle lokality lišit.',
              'The server responded quickly, so the browser can start building the page right away. A fast TTFB is the foundation a good LCP rests on. Measured from a single request; real values vary by location.',
            )
          : ttfb <= 1800
            ? t(
                'Server odpovídá pomaleji, než je ideální. Zvažte cache na úrovni stránky nebo CDN, optimalizaci databázových dotazů a vypnutí zbytečných pluginů. Každá ušetřená stovka milisekund se přímo promítne do LCP.',
                'The server is slower to respond than it should be. Consider page-level caching or a CDN, optimising database queries and disabling unnecessary plugins. Every hundred milliseconds saved feeds straight into LCP.',
              )
            : t(
                'Server odpovídá velmi pomalu a zdržuje úplně všechno, co následuje. Nasaďte plnou stránkovou cache nebo CDN, zkontrolujte pomalé dotazy na backendu a ověřte, že hosting stačí na provoz webu. Bez opravy TTFB se ostatní rychlostní metriky zlepšit nedají.',
                'The server is very slow to respond and holds up everything that follows. Put full page caching or a CDN in front, check for slow backend queries, and verify the hosting can handle the traffic. Without fixing TTFB the other speed metrics cannot improve.',
              ),
    });
  } else {
    checks.push({
      id: 'ttfb',
      label: ttfbLabel,
      status: 'unknown',
      value: t('nepodařilo se ověřit', 'could not verify'),
      weight: 2,
      detail: t(
        'Odezvu serveru se nepodařilo změřit, protože se nepodařilo doručit odpověď na požadavek. Zkuste audit spustit znovu.',
        'The server response time could not be measured because no response was received. Try running the audit again.',
      ),
    });
  }

  return checks;
}
