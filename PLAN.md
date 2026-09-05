# PLAN.md — Web Audit Tool (Rychlost / SEO / AEO / GEO / Správnost)

Stateless webová aplikace: uživatel vloží URL, aplikace stáhne HTML + doprovodné soubory, zavolá PageSpeed Insights a vrátí pravidly řízený report v 5 kategoriích.

**Žádné LLM, žádná DB, žádný headless browser, žádná autentizace.**

---

## 1. Architektura

```
┌───────────────┐   POST /api/audit    ┌────────────────────────┐
│  app/page.tsx │ ───{ url }─────────▶ │ app/api/audit/route.ts │
│  (client)     │ ◀──AuditResult────── │  runtime = nodejs      │
└───────────────┘        JSON          │  maxDuration = 60      │
                                       └───────────┬────────────┘
                                                   │ Promise.allSettled
        ┌──────────────┬──────────────┬────────────┼───────────┬─────────────┐
        ▼              ▼              ▼            ▼           ▼             ▼
   GET target     /robots.txt    /llms.txt   /sitemap.xml   PSI API    HEAD odkazy
     (8 s)           (6 s)         (6 s)        (6 s)       (45 s)     (5 s x <=15)
        │
        ▼
   cheerio.load(html) ──▶ lib/checks/{speed,seo,aeo,geo,tech}.ts ──▶ lib/scoring.ts
```

Klíčové principy:

* **Odolnost** — každý externí call má `AbortController` timeout a jde přes `Promise.allSettled`. Selhání jedné služby znamená, že konkrétní kontrola dostane stav `unknown` („nepodařilo se ověřit"), audit doběhne.
* **Čistota** — kontroly jsou čisté funkce `(ctx: AuditContext) => CheckResult[]`. Texty doporučení jsou statické stringy vybírané `if/else` větvením. Nikde žádné generování textu.
* **Stateless** — nic se neukládá, žádný cache layer, žádná historie.

## 2. Struktura souborů

```
PLAN.md, README.md, .env.example, .gitignore
package.json, tsconfig.json, next.config.mjs, postcss.config.mjs, tailwind.config.ts

app/
  layout.tsx           – fonty (Outfit + Urbanist), metadata, grain overlay
  globals.css          – design tokeny, Tailwind vrstvy, animace
  page.tsx             – stavový stroj: idle → running → done | error
  api/audit/route.ts   – POST endpoint, orchestrace, maxDuration = 60

lib/
  types.ts             – CheckStatus, CheckResult, CategoryResult, AuditResult, AuditContext
  http.ts              – fetchWithTimeout, fetchPage (měří TTFB), fetchText, headOrGet
  url.ts               – normalizeUrl (doplní https://), guard proti localhost/private IP
  robots.ts            – parser robots.txt (skupiny user-agentů, sitemapy, odkaz na llms.txt)
  pagespeed.ts         – volání PSI v5, extrakce LCP/INP/CLS/TBT/score, field vs lab
  jsonld.ts            – extrakce a bezpečné parsování JSON-LD bloků, hledání @type
  format.ts            – české formátování času, procent, velikostí
  scoring.ts           – vážené skóre kategorie + celkové skóre
  checks/
    speed.ts  seo.ts  aeo.ts  geo.ts  tech.ts

components/
  UrlForm.tsx          – vstupní pole + CTA
  LoadingState.tsx     – fáze auditu („Kontroluji rychlost stránky…")
  ScoreRing.tsx        – SVG kruhový graf skóre
  ReportView.tsx       – hlavička reportu + souhrn + mřížka kategorií
  CategoryCard.tsx     – karta kategorie s rozbalitelnými kontrolami
  CheckRow.tsx         – řádek kontroly (stav, hodnota, doporučení, meta render)
```

## 3. API kontrakt

### `POST /api/audit`

Request:

```jsonc
{ "url": "example.com" }        // protokol volitelný, doplní se https://
```

Response `200`:

```jsonc
{
  "url": "https://example.com/",          // normalizovaný vstup
  "finalUrl": "https://www.example.com/", // po redirectech
  "fetchedAt": "2026-09-04T10:00:00.000Z",
  "durationMs": 12431,
  "overallScore": 74,
  "meta": {
    "statusCode": 200,
    "ttfbMs": 320,
    "htmlBytes": 48210,
    "pagespeedAvailable": true,
    "pagespeedUsedKey": false,
    "pagespeedError": null,
    "likelySpa": false,
    "confidence": 0.96,                    // podíl ověřené váhy v celém auditu
    "scoredCategories": 5,
    "totalCategories": 5
  },
  "notes": ["…hlášky pro UI, např. o chybějícím API klíči…"],
  "blockers": [                            // fatální nálezy; když nejsou, prázdné pole
    {
      "id": "indexability",
      "label": "Indexovatelnost stránky",
      "reason": "Stránka má direktivu noindex…"
    }
  ],
  "categories": [
    {
      "id": "speed",                       // speed | seo | aeo | geo | tech
      "title": "Rychlost",
      "subtitle": "Core Web Vitals a odezva serveru",
      "score": 62,                         // zaokrouhlené, pro zobrazení
      "scoreRaw": 61.7,                    // nezaokrouhlené, pro celkový průměr
      "scored": true,                      // false = ověřeno < 60 % váhy, do průměru nejde
      "confidence": 1,                     // podíl ověřené váhy v kategorii
      "checks": [
        {
          "id": "lcp",
          "label": "LCP (Largest Contentful Paint)",
          "status": "warn",                // pass | warn | fail | unknown
          "score": 0.53,                    // volitelné spojité skóre 0–1
          "value": "3,1 s",
          "weight": 3,                      // 0 = informativní, mimo skóre
          "detail": "2–3 věty statického textu: co to znamená a jak to opravit.",
          "blocker": "…proč je nález fatální…",     // volitelné; platí jen při status: fail
          "meta": { "kind": "bots", "rows": [] }   // volitelná data pro speciální render
        }
      ]
    }
  ]
}
```

Response `400` — nevalidní / zakázaná URL:

```jsonc
{ "error": "Zadejte platnou veřejnou URL adresu." }
```

Response `502` — cílovou stránku se nepodařilo stáhnout:

```jsonc
{ "error": "Stránku se nepodařilo načíst.", "detail": "Vypršel časový limit 8000 ms." }
```

## 4. Seznam kontrol

### Rychlost (PSI mobile + hlavičky) — `lib/checks/speed.ts`

| id | kontrola | pass / warn / fail |
|---|---|---|
| `psi-performance` | Performance skóre PSI (informativní, váha 0) | ≥90 / ≥50 / <50 |
| `lcp` | Largest Contentful Paint | ≤2,5 s / ≤4 s / >4 s |
| `inp` | INP (field data), fallback TBT (lab) | INP ≤200 / ≤500 ms; TBT ≤200 / ≤600 ms |
| `cls` | Cumulative Layout Shift | ≤0,1 / ≤0,25 / >0,25 |
| `ttfb` | TTFB z odpovědi cílové URL | ≤800 ms / ≤1800 ms / >1800 ms |

### SEO — `lib/checks/seo.ts`

`indexability` (`noindex` / `nofollow` v `<meta name="robots">`, `<meta name="googlebot">`
nebo v hlavičce `X-Robots-Tag`; `noindex` je blokátor),
`title` (existuje, 10–60 zn.), `meta-description` (50–160 zn.), `h1` (právě jeden),
`heading-hierarchy` (H2/H3 nepřeskakují úroveň), `canonical` (existuje, absolutní URL),
`robots-txt` (existuje, není `Disallow: /` pro `User-agent: *`),
`sitemap` (odkaz v robots.txt nebo živá `/sitemap.xml`),
`https-mixed-content` (HTTPS + žádné `http://` u img/script/link/iframe),
`image-alt` (% obrázků bez alt: 0 % / ≤20 % / >20 %),
`structured-data` (≥1 blok JSON-LD, který projde `JSON.parse`),
`html-lang` (atribut `lang` na `<html>`).

### AEO — `lib/checks/aeo.ts`

`aeo-schema` (FAQPage nebo HowTo v JSON-LD),
`question-headings` (podíl H2/H3 s otazníkem nebo začínajících na Jak/Co/Proč/Kdy/Kde/Kolik/How/What/Why),
`direct-answer` (první odstavec pod prvním H2/H3 kratší než ~50 slov),
`content-depth` (počet slov viditelného textu: ≥600 / ≥250 / <250),
`answer-format` (seznamy a tabulky mimo navigaci: ≥2 / 1 / 0),
`paragraph-length` (medián délky odstavce: ≤60 / ≤100 / >100 slov).

`question-headings` a `direct-answer` se hodnotí jen na textových stránkách — tedy když
JSON-LD nese `Article`/`BlogPosting`/`NewsArticle`/`TechArticle`/`FAQPage`/`QAPage`/`HowTo`,
nebo je v HTML `<article>`, nebo má stránka aspoň 400 slov textu. Jinak dostanou `unknown`:
na homepage e-shopu formát otázka–odpověď nemá co dělat a nemá se za něj trestat.
Slova se počítají z textu bez `<script>`, `<style>` a `<svg>`.

### GEO — `lib/checks/geo.ts`

`llms-txt` (existuje `/llms.txt`; bonus když na něj odkazuje robots.txt),
`ai-bots` (stav pro GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot,
Google-Extended, Applebot-Extended, meta-externalagent, CCBot, Bytespider — v UI
rozdělené na *trénovací* vs *vyhledávací*; do skóre se počítá jen blokace vyhledávacích,
protože blokace trénovacích je legitimní volba),
`entity-links` (odkazy na linkedin.com / wikidata.org / crunchbase.com),
`content-freshness` (`dateModified` / `datePublished` v JSON-LD nebo `article:modified_time`).

### Správnost / technika — `lib/checks/tech.ts`

`viewport` (meta viewport), `favicon` (`link[rel*=icon]` nebo živé `/favicon.ico`),
`security-headers` (HSTS, X-Content-Type-Options, CSP — jen výpis, váha 0, nikdy `fail`),
`broken-links` (max 15 interních odkazů z HTML, `HEAD` s fallbackem na `GET`, timeout 5 s;
hodnotí se podíl rozbitých, ne absolutní počet).

## 5. Skórování

Detailní rozbor a historie změn je v [SCORING-REWORK.md](SCORING-REWORK.md).

### Hodnota kontroly

* Stav → hodnota: `pass = 1`, `warn = 0.5`, `fail = 0`, `unknown` = vyřazeno z výpočtu.
* Měřitelné metriky mají navíc spojité `score` (0–1) z funkce `ramp(value, {good, poor, zero})`:
  `good → 1`, `poor → 0,5`, `zero → 0`, mezi tím lineárně. Používají ho LCP, INP, TBT, CLS,
  TTFB, podíl obrázků bez `alt` a podíl rozbitých odkazů. Stav (barva) se nemění, mění se číslo —
  LCP 2,6 s a 3,9 s jsou oba `warn`, ale 0,97 vs. 0,53.
* Váhy: kritické `3`, střední `2`, nice-to-have `1`, informativní `0`.
  Nulovou váhu mají `psi-performance` (je to už kombinace LCP/TBT/CLS/FCP/SI, jinak by se
  počítalo dvakrát) a `security-headers` (není SEO téma). Do skóre ani do míry jistoty nevstupují.

### Kategorie

* `score = round(Σ(weight × value) / Σ(weight) × 100)` jen přes hodnocené kontroly;
  `scoreRaw` drží nezaokrouhlenou hodnotu pro celkový průměr.
* `confidence = ověřená váha / celková váha` kategorie.
* Pojistka proti malému vzorku: `confidence < 0,6` → `scored: false`, kategorie zobrazí `—`
  místo zavádějícího čísla (typicky Rychlost, když vypadne PageSpeed a zbyde jen TTFB).

Součty vah: Rychlost 9, SEO 26, AEO 7, GEO 7, Správnost 6.

### Celkové skóre

* Vážený průměr kategorií, ne prostý: `seo 30, speed 25, aeo 15, geo 15, tech 15`.
  Bez vah by jedna jednotka váhy v AEO (Σ 7) stála víc než v SEO (Σ 26) a nice-to-have
  kontrola by trestala víc než chybějící `title`.
* Počítá se z `scoreRaw`, aby se nezaokrouhlovalo dvakrát. Nehodnocené kategorie se
  renormalizují pryč a `meta.scoredCategories` / `meta.confidence` to přiznají v UI.
* **Blokátory.** Kontrola může nést `blocker` — text, proč je nález fatální. Když taková
  kontrola skončí jako `fail`, celkové skóre se zastropuje na 35 bodech a nad reportem se
  zobrazí červený pruh. Blokátory: `indexability` (`noindex`), `robots-txt` (`Disallow: /`
  pro všechny), `https-mixed-content` (bez HTTPS) a odpověď HTTP ≥ 400. Bez stropu by web
  s `Disallow: /` dostal 91 bodů a hodnocení „Dobré".
* Pásma pro UI: `≥90 skvělé`, `≥75 dobré`, `≥50 průměrné`, `<50 slabé`.

## 6. UI/UX

Vizuální směr podle referencí (Superhuman / Osmo): tmavý inkoustový podklad, krémová typografie, geometrický grotesk **Outfit** v display velikostech (semibold, těsný prostrk) v kombinaci s **Urbanist** pro běžný text, jemné zrno a teplé radiální světlo, jeden signální akcent (oranžová `#FF6A3D`). Žádné modro-fialové SaaS gradienty.

* **Idle** — velký nadpis, jedno vstupní pole ve tvaru pilulky s tlačítkem uvnitř, pruh pěti kategorií, poznámka o SPA a o PSI klíči.
* **Running** — fázový indikátor: „Stahuji HTML…" → „Čtu robots.txt, llms.txt a sitemapu…" → „**Kontroluji rychlost stránky…**" (nejdelší) → „Skládám report…" + progress pruh.
* **Done** — hlavička s URL a časem, velké celkové skóre v kruhu, mřížka 5 karet (mini kruh + název + skóre), uvnitř rozbalitelný seznam kontrol se stavem, naměřenou hodnotou a doporučením. Speciální render tabulky AI botů, seznamu chybějících hlaviček a rozbitých odkazů.
* Plně responzivní (1 sloupec na mobilu, 2–3 na desktopu), respektuje `prefers-reduced-motion`.

## 7. Deployment

* Next.js 14 App Router, zero-config build na Vercelu (Hobby plán).
* `export const maxDuration = 60` v API route (Fluid Compute).
* `.env.example` s volitelným `GOOGLE_PAGESPEED_API_KEY`; bez klíče se volá anonymně a UI zobrazí poznámku o nižším rate limitu.
* README: `npm install`, `npm run dev`, import repa na Vercelu, volitelná env proměnná.
