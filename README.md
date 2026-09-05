# Audit webu — Rychlost / SEO / AEO / GEO / Správnost

Stateless webová aplikace: vložíte URL, nástroj spustí přes třicet automatických kontrol a zobrazí report v šesti kategoriích (rychlost se hodnotí zvlášť pro mobil a pro počítač).

**Všechna doporučení jsou statická a pravidly řízená** — žádný text negeneruje jazykový model. Každý závěr je `if/else` navázaný na konkrétní naměřenou hodnotu.

## Co nástroj kontroluje

| Kategorie | Obsah |
|---|---|
| **Rychlost — mobil** | Performance skóre, LCP, INP (reálná data) s fallbackem na TBT, samostatné TBT, CLS, TTFB |
| **Rychlost — počítač** | Totéž měřené se `strategy=desktop`; TTFB se boduje jen u mobilu, je to vlastnost serveru |
| **SEO** | Indexovatelnost (`noindex`), title, meta description, H1, hierarchie nadpisů, canonical, robots.txt, sitemapa, mixed content, alt atributy, JSON-LD, `lang` |
| **AEO** | FAQPage / HowTo schéma, otázkové nadpisy, délka první odpovědi, hloubka obsahu, seznamy a tabulky, délka odstavců |
| **GEO** | `/llms.txt`, pravidla pro 10 AI botů (trénovací vs. vyhledávací), odkazy na entitní profily, signál aktuálnosti obsahu |
| **Správnost** | Meta viewport, favicon, bezpečnostní hlavičky, rozbité interní odkazy (max. 15) |

## Tech stack

Next.js 14 (App Router, TypeScript) · Tailwind CSS · cheerio · Google PageSpeed Insights API.

Bez databáze, bez autentizace, bez headless prohlížeče. Audit se počítá on-the-fly při každém požadavku a nikam se neukládá.

## Lokální spuštění

```bash
npm install
```

```bash
npm run dev
```

Aplikace poběží na <http://localhost:3000>.

Klíč pro PageSpeed Insights patří do `.env.local` (soubor je v `.gitignore`, do repozitáře se nedostane):

```bash
cp .env.example .env.local
```

Do `.env.local` pak doplňte `GOOGLE_PAGESPEED_API_KEY=AIza…`. Po změně je potřeba restartovat dev server.

Bez klíče aplikace funguje také — PageSpeed Insights se volá anonymně s výrazně nižším limitem požadavků. Pokud limit vyčerpáte, rychlostní kontroly se zobrazí jako „nepodařilo se ověřit" a zbytek auditu proběhne normálně.

Kontrola typů:

```bash
npm run typecheck
```

## Deploy na Vercel (Hobby plán, zdarma)

1. Nahrajte repozitář na GitHub.
2. Na <https://vercel.com/new> repozitář importujte. Next.js se detekuje automaticky, žádné build nastavení není potřeba měnit.
3. *(Volitelné)* V **Project Settings → Environment Variables** přidejte `GOOGLE_PAGESPEED_API_KEY` pro prostředí Production i Preview.
4. Klikněte na **Deploy**.

API route má `export const maxDuration = 60`, protože volání PageSpeed Insights často přesáhne výchozích 10 sekund. Na Hobby plánu to funguje díky Fluid Compute — pokud by se deploy vzpíral, zapněte **Settings → Functions → Fluid Compute**.

Po změně environment proměnné je potřeba projekt znovu nasadit, aby se změna projevila.

## Jazyky

Aplikace běží česky a anglicky, přepínač je v navigaci vedle motivu. Volba se pamatuje
v `localStorage` a promítne se do adresy jako `?lang=en`, takže se dá poslat odkaz rovnou
v angličtině. Skript v `<head>` nastaví `<html lang>` ještě před vykreslením — pořadí je
adresa, uložená volba, jazyk prohlížeče.

Překlady žijí na dvou místech a je to záměr:

* **`lib/i18n/ui.ts`** — souvislé bloky rozhraní (hero, FAQ, doporučení, patička, texty
  reportu). Běžný slovník; angličtina je typovaná podle češtiny (`UiDict = typeof cs`),
  takže vynechaný klíč neprojde překladem.
* **Přímo u kontrol** — každá kontrola volá `t('česky', 'anglicky')` v místě, kde se text
  vybírá. Kontrol je přes třicet a většina má tři až čtyři varianty podle naměřené hodnoty;
  se vzdálenou mapou klíčů by se prahy a texty časem rozešly a nikdo by si toho nevšiml.
  Takhle je při úpravě prahu překlad na očích.

Formátování čísel jde s jazykem — čeština píše desetinnou čárku a mezeru před procentem,
angličtina tečku a procento natěsno.

**Report vzniká rovnou v obou jazycích.** Kontroly jsou čisté funkce nad už naparsovaným
DOMem, takže druhé vyhodnocení stojí zlomek milisekundy, a API vrací `byLocale: { cs, en }`.
Přepnutí jazyka nad hotovým reportem se tak obejde bez nového auditu i bez nového měření
u Googlu — což by jinak znamenalo desítky sekund čekání a další díl limitu klíče. Odpověď
tím naroste z 5,6 kB na 8,9 kB po gzipu; opakující se struktura se komprimuje dobře.

## Log

Každý audit i každé rychlostní měření zapíše jeden řádek JSON. Na `console` jde vždycky —
to je na Vercelu jediné, co přežije, protože souborový systém funkce je jen pro čtení.
Lokálně se stejný řádek přidá navíc do `logs/audit.jsonl` (soubor je v `.gitignore`):

```bash
tail -f logs/audit.jsonl
```

Cestu lze přesměrovat proměnnou `AUDIT_LOG_FILE`. Zápis je „vystřel a zapomeň", takže
nedostupný disk ani plná kvóta nemůžou audit zdržet nebo shodit.

Události:

| `event` | Kdy | Co obsahuje |
|---|---|---|
| `audit` | Dokončený hlavní audit | URL, HTTP stav, doba trvání, velikost HTML, TTFB, fatální nálezy, skóre kategorií mimo rychlost |
| `audit-error` | Stránku se nepodařilo stáhnout | URL, stav, důvod |
| `psi` | Každé jednotlivé volání PageSpeed Insights | URL, strategie, pořadí pokusu, rozpočet, skutečná doba, výsledek, Performance skóre, chyba |

Řádky `psi` jsou to hlavní, kvůli čemu log existuje — je z nich vidět, které měření kdy
vypršelo, jestli pomohl opakovaný pokus a jestli se nenaráží na limit klíče.

## Známá omezení

* **SPA weby.** Audit pracuje se staženým HTML (`fetch` + `cheerio`), takže obsah dogenerovaný JavaScriptem nevidí. Aplikace na to sama upozorní, když stránku rozpozná jako SPA.
* **Rozbité odkazy.** Kontroluje se maximálně 15 interních odkazů nalezených přímo v HTML — nejde o průchod celým webem.
* **PageSpeed Insights.** Externí služba, na kterou nemáme vliv, a zdaleka nejkřehčí část auditu. Neběží proto uvnitř `/api/audit`, ale v samostatném endpointu `/api/audit/speed`, který prohlížeč volá dvakrát souběžně — zvlášť pro mobil a zvlášť pro počítač. Každý požadavek je vlastní instance funkce s vlastním rozpočtem 60 s; dokud obě strategie sdílely jeden rozpočet, jedna z nich pravidelně nedoběhla. Když měření vyprší, prohlížeč ho zopakuje (dva pokusy, ten druhý s kratším limitem) — Google mezitím Lighthouse dopočítá a nacachuje, takže opakovaný pokus obvykle projde. Terminální chyby (HTTP 429 kvůli limitu, HTTP 400 u neanalyzovatelné adresy) se neopakují. Report se zobrazí až s oběma měřeními, ne po částech. Když ani opakování nepomůže, kategorie zobrazí `—`, report to vysvětlí a nabídne tlačítko **Doměřit rychlost na …**, které pustí jen chybějící měření a doplní ho do hotového reportu.
* **Auditovat lze jen veřejné adresy.** Požadavky na `localhost` a privátní rozsahy IP jsou odmítnuty.

## Struktura

```
app/
  layout.tsx                 fonty, motiv (skript proti probliknutí), ambientní pozadí
  globals.css                barevné tokeny pro světlý i tmavý motiv, sklo, animace
  page.tsx                   jednostránkový layout + stavový stroj (idle → running → done | error)
  api/audit/route.ts         POST endpoint, všechny kontroly kromě rychlosti
  api/audit/speed/route.ts   jedno rychlostní měření (mobil / počítač), vlastní rozpočet funkce
lib/
  checks/                    pět modulů s kontrolami, každý vrací CheckResult[]
  i18n/                      Locale, přepínač textů kontrol, slovník rozhraní
  http.ts robots.ts jsonld.ts pagespeed.ts url.ts scoring.ts format.ts log.ts types.ts
components/
  SiteNav ThemeToggle LanguageToggle LocaleProvider SiteFooter SectionHeading
  Reveal Faq RichText AmbientPattern
  UrlForm LoadingState ReportView CategoryCard CheckRow ScoreRing
```

Podrobný návrh včetně API kontraktu a prahových hodnot je v [PLAN.md](PLAN.md).

## Vzhled a motiv

Barvy jsou vedené jako CSS proměnné (`--c-*`) v `app/globals.css` a Tailwind na ně míří přes
`rgb(var(--c-x) / <alpha-value>)`. Přepnutí motivu tak znamená výměnu jedné sady hodnot na
`<html data-theme>` — komponenty o motivu nevědí nic a nikde se nezdvojují třídy.

* **Akcent a tlačítka.** Akcentem je přechod modrá → fialová (`--c-grad-a`, `--c-grad-b`)
  a jeho střední odstín `--c-signal` pro plochy, které přechod neunesou. Hlavní tlačítka
  ale akcentovou paletu nepoužívají: mají vlastní token `--c-ink`, který je obráceným
  motivem — ve světlém režimu černé tlačítko, v tmavém bílé. Přechod se u nich objeví
  jen jako barevný stín při najetí.
* **Světlý / tmavý režim.** Výchozí stav se řídí nastavením systému, volba se pamatuje
  v `localStorage`. Malý skript v `<head>` nastaví motiv ještě před prvním vykreslením, aby
  stránka neproblikla ve špatných barvách.
* **Sklo a pohyb.** Karty stojí na `backdrop-filter` nad dvěma pomalu plujícími barevnými
  světly. Animuje se výhradně `transform` a `opacity`, takže vše běží na GPU.
* **Mřížka na pozadí.** `AmbientPattern` drží tři vrstvy bodů: statický základ a dvě
  barevné kopie odkryté kruhovou maskou. V klidu maska sleduje kurzor, během auditu ho
  ignoruje a obchází stránku sama po pomalé smyčce. Pozici zapisuje rAF přímo do CSS
  proměnných — přes React state by se stránka překreslovala desetkrát za sekundu.
* **Odhalování při scrollu.** Komponenta `Reveal` používá `IntersectionObserver`, ne scroll
  listener. Bez JavaScriptu se obsah zobrazí rovnou (`<noscript>` fallback).
* **Kotvy.** Odsazení pod plovoucí navigaci řeší jediná vlastnost, `scroll-padding-top` na
  `html`. Sekce proto nesmí mít vlastní `scroll-mt` (sčítalo by se) ani horní `padding`
  (leží uvnitř cíle, takže by nadpis skončil uprostřed obrazovky) — mezery mezi nimi dělá
  `margin`.
* **Omezení pohybu.** Při `prefers-reduced-motion: reduce` se vypnou animace i plynulé
  posouvání na kotvy.

## Skórování

**Kontrola → hodnota.** Každá kontrola má stav `pass` / `warn` / `fail` / `unknown` a váhu (3 = kritické, 1 = nice-to-have, 0 = informativní řádek mimo skóre). Základní hodnoty jsou `pass = 1`, `warn = 0,5`, `fail = 0`; kontroly se stavem `unknown` se do výpočtu nezapočítávají.

**Měřitelné metriky mají skóre spojité.** LCP, INP/TBT, CLS, TTFB, podíl obrázků bez `alt` a podíl rozbitých odkazů se převádějí po částech lineárně (`ramp` v `lib/scoring.ts`): hranice „dobré" = 1, hranice „špatné" = 0,5, dál lineárně k nule. LCP 2,6 s a 3,9 s mají oba stav `warn`, ale skóre 0,97 a 0,53 — každé skutečné zlepšení je ve výsledku vidět.

**Souhrnné Performance skóre je v reportu zvýrazněné.** Je to jediné číslo z celé kategorie, které lidé znají odjinud — z PageSpeedu nebo z Lighthouse — a mezi ostatními řádky zanikalo. Řádek proto dostane barevný podklad podle stavu a hodnotu vysázenou velkým písmem. Zapíná to `featured` na `CheckResult`, ne natvrdo zadané id v komponentě.

**Souhrnné Performance skóre se boduje taky, ale slabě.** Lighthouse ho počítá i z metrik, které samostatně neměříme — FCP, Speed Indexu a TBT. Bez něj mohla kategorie hlásit 100, zatímco PageSpeed vedle toho ukazoval 58: LCP, INP i CLS byly v pořádku a zablokované hlavní vlákno se do hodnocení vůbec nedostalo. Má proto váhu 1 proti 3 u LCP, aby rozpor zmizel, ale číslo pořád táhly Core Web Vitals. Ze stejného důvodu se TBT přidává jako samostatný řádek, když INP přišlo z reálných dat a fallback na TBT se neuplatnil.

**Kategorie.** Skóre = vážený průměr přes ověřené kontroly. Když je ověřeno méně než 60 % váhy kategorie, kategorie se označí jako nehodnocená a zobrazí `—` místo čísla, které by stálo na příliš malém vzorku. Výpadek PageSpeed Insights tak nemůže vyrobit „Rychlost 100" z jediné úspěšné metriky.

**Celkem.** Vážený průměr kategorií — SEO 30 %, Rychlost 25 % (mobil 15 %, počítač 10 %), AEO 15 %, GEO 15 %, Správnost 15 %. Bez těchto vah by prostý průměr rozbil váhy uvnitř kategorií: AEO má součet vah 7 a SEO 26, takže jedna nice-to-have kontrola v AEO by trestala víc než chybějící `<title>`. Nehodnocené kategorie se z průměru renormalizují pryč a report v hlavičce uvede, z kolika kategorií skóre vzniklo a kolik procent kontrol se podařilo ověřit.

**Fatální nálezy zastropují skóre.** `noindex`, `Disallow: /` pro všechny roboty, chybějící HTTPS a odpověď HTTP ≥ 400 znamenají, že web ve vyhledávání prakticky není. Celkové skóre se v takovém případě zastropuje na 35 bodech a nad reportem se zobrazí červený pruh — bez toho by web s `Disallow: /` dostal 91 bodů a hodnocení „Dobré".

**Kontext stránky.** Kontroly „otázkové nadpisy" a „přímá odpověď" se hodnotí jen na textových stránkách (schéma `Article`/`FAQPage`/…, prvek `<article>`, nebo aspoň 400 slov textu). Na homepage e-shopu se označí jako neověřené místo toho, aby trestaly něco, co tam ani nemá být.
