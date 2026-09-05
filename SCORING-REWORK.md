# Zadání — přepracování skórovací logiky

Pořadí kroků je dané: **A → B → E → D → F → G → C → H**, teprve pak **I**.
Po každém kroku: `npm run typecheck` + ověření chování přes `/api/selftest` a reálný audit.

Pomocná testovací route `app/api/selftest/route.ts` se vytvoří v kroku A a **smaže se na konci kroku I**.

---

## A — Vážený celkový průměr

**Problém:** `overallScore` je prostý průměr pěti kategorií. Protože kategorie mají velmi
různé součty vah (SEO 23, AEO 4), stojí jedna jednotka váhy v AEO 5,00 bodu celkového
skóre a v SEO 0,87. Chybějící `<title>` (váha 3) tak stojí míň než chybějící otazník
v nadpisu (váha 1).

**Řešení:** explicitní váhy kategorií v `lib/scoring.ts`.

| kategorie | váha |
|---|---|
| seo | 30 |
| speed | 25 |
| aeo | 15 |
| geo | 15 |
| tech | 15 |

```
overall = round( Σ(catWeight × score) / Σ(catWeight) )   // jen kategorie se scored: true
```

**Hotovo když:** kategorie s `scored: false` se z čitatele i jmenovatele vypustí;
selftest ověří renormalizaci.

---

## B — Blokátory (tvrdý strop skóre)

**Problém:** web s `Disallow: /` pro `*` dostane celkem 89 = „Dobré". Web, který není
ve vyhledávání, nesmí mít skoro nejlepší hodnocení.

**Řešení:**
- `CheckResult` dostane volitelné `blocker?: string` — text, proč je to fatální.
- Blokátor se počítá jen když má kontrola `status: 'fail'`.
- `AuditResult` dostane `blockers: { id, label, reason }[]`.
- Když je aspoň jeden blokátor, `overallScore = min(overall, 35)`.
- UI: červený pruh nad reportem se seznamem blokátorů.

Blokátory v tomto kroku: `robots-txt` (Disallow: / pro všechny),
`https-mixed-content` (jen varianta „bez HTTPS"), HTTP status ≥ 400.
`noindex` se přidá v kroku C.

**Hotovo když:** selftest ověří strop i to, že bez blokátoru se skóre nemění.

---

## E — Odstranit dvojí započítání v Rychlosti

**Problém:** `psi-performance` (váha 3) je sám vážená kombinace LCP/TBT/CLS/FCP/SI.
Vedle toho se LCP, CLS a TBT hodnotí ještě jednou samostatně. Špatné LCP trestá dvakrát.

**Řešení:** `psi-performance` dostane `weight: 0` — zůstane v UI jako informativní řádek,
do skóre nevstupuje. Σ vah Rychlosti klesne z 12 na 9.

Podmínka: `scoreChecks` musí kontroly s nulovou váhou zcela ignorovat (nepřičítat je
ani do `knownWeight`, ani do `unknownWeight`). UI je označí štítkem „neboduje se".

**Hotovo když:** při nedostupném PSI zůstane Rychlost `scored: false` (unknown 7 : known 2).

---

## D — Spojité skóre u metrik

**Problém:** `warn = 0,5` plošně. LCP 2,6 s a 3,9 s mají stejné skóre; optimalizace
se ve výsledku neprojeví.

**Řešení:** `CheckResult` dostane volitelné `score?: number` (0–1).
`scoreChecks` použije `check.score ?? STATUS_VALUE[check.status]`.

Nová funkce v `lib/scoring.ts`:

```ts
ramp(value, { good, poor, zero })   // menší = lepší
// v <= good            -> 1
// good < v < poor      -> lineárně 1 -> 0,5
// poor <= v < zero     -> lineárně 0,5 -> 0
// v >= zero            -> 0
```

`rampUp` (větší = lepší) nakonec potřeba není: jediná metrika, kde větší znamená lepší,
je `psi-performance`, a ta má po kroku E nulovou váhu. `content-depth` se řeší tím, že se
do `ramp` posílá `600 − počet slov`.

Kotvy:

| metrika | good | poor | zero |
|---|---|---|---|
| LCP | 2500 ms | 4000 ms | 8000 ms |
| CLS | 0,1 | 0,25 | 0,6 |
| TTFB | 800 ms | 1800 ms | 5000 ms |
| INP | 200 ms | 500 ms | 1500 ms |
| TBT | 200 ms | 600 ms | 2000 ms |
| % obrázků bez alt | 0 % | 20 % | 100 % |

Stavy `pass/warn/fail` a texty zůstávají beze změny — mění se jen číslo.

**Hotovo když:** selftest ověří spojitost i shodu s hranicemi (v = good → 1, v = poor → 0,5).

---

## F — AEO se nemá hodnotit na netextových stránkách

**Problém:** `question-headings` a `direct-answer` trestají homepage e-shopu, kde ta
kontrola nedává smysl.

**Řešení:** helper `isContentPage(ctx)` — stránka je textová, když platí aspoň jedno:
- JSON-LD obsahuje `Article`, `BlogPosting`, `NewsArticle`, `FAQPage`, `QAPage` nebo `HowTo`
- v HTML je `<article>`
- text v `<body>` má ≥ 400 slov

Když ne, dostanou `question-headings` i `direct-answer` stav `unknown` s vysvětlením.
`aeo-schema` se hodnotí vždy.

**Hotovo když:** homepage e-shopu má tyto dvě kontroly jako `unknown`, článek ne.

---

## G — Jemnější granularita AEO

**Problém:** se součtem vah 4 nabývá AEO jen devíti hodnot, krok 12,5 bodu.
(Sloučení AEO+GEO je vyloučené — zadání vyžaduje pět kategorií.)

**Řešení:** tři nové kontroly, každá váha 1 → Σ 7, krok 7,1 bodu:

| id | co měří | pass / warn / fail |
|---|---|---|
| `content-depth` | počet slov v `<body>` | ≥ 600 / ≥ 250 / < 250 |
| `answer-format` | `<ul>`/`<ol>`/`<table>` v obsahu | ≥ 2 bloky / 1 blok / 0 |
| `paragraph-length` | medián délky odstavce ve slovech | ≤ 60 / ≤ 100 / > 100 |

**Odchylka od původního návrhu:** všechny tři nové kontroly se hodnotí vždy, i na netextové
stránce. Kdyby `content-depth` a `paragraph-length` podléhaly bráně z kroku F, zbyly by na
homepage e-shopu jen 3 ze 7 jednotek váhy (0,43), kategorie by spadla pod práh z kroku H
a AEO by u většiny homepage ukazovalo `—`. Tenký obsah a dlouhé odstavce jsou navíc pro
citovatelnost problém na jakékoli stránce, ne jen na článku.

**Hotovo když:** AEO má 6 kontrol, Σ vah 7.

---

## C — Kontrola indexovatelnosti (`noindex`)

**Problém:** `noindex` se nekontroluje vůbec. Stránka s `noindex` projde auditem jako v pořádku.

**Řešení:** nová SEO kontrola `indexability`, váha 3, blokátor.
Čte `<meta name="robots">`, `<meta name="googlebot">` a hlavičku `X-Robots-Tag`.

| nález | stav |
|---|---|
| `noindex` kdekoli | `fail` + blokátor |
| jen `nofollow` | `warn` |
| nic / `index,follow` | `pass` |

Σ vah SEO stoupne z 23 na 26.

**Hotovo když:** stránka s `noindex` má celkové skóre ≤ 35 a blokátor v UI.

---

## H — Míra jistoty místo tichého vypuštění

**Problém:** práh malého vzorku je ostrá hrana (`unknownWeight > knownWeight`) a když
kategorie vypadne, nikde není řečeno, že skóre není srovnatelné.

**Řešení:**
- práh přes poměr: kategorie je hodnocená, když `knownWeight / totalWeight >= 0,6`
- `AuditMeta` dostane `confidence` (0–1, podíl ověřené váhy přes všechny kontroly)
  a `scoredCategories` / `totalCategories`
- UI to zobrazí v hlavičce reportu

**Hotovo když:** při nedostupném PSI ukáže report „4 z 5 kategorií" a nižší jistotu.

---

## I — Drobnosti (až po zbytku)

1. **Dvojí zaokrouhlení** — skóre kategorie se drží nezaokrouhlené (`scoreRaw`),
   zaokrouhluje se až při zobrazení a celkové skóre jen jednou.
2. **`broken-links`** — hodnotit podíl, ne absolutní počet (`ramp` na % rozbitých).
3. **`security-headers`** — `weight: 0` (informativní), místo dnešní ozdobné 0,5.
4. **`image-alt`** — v textu doporučení výslovně zmínit, že `alt=""` je správně
   a kontrola hlídá jen chybějící atribut.
5. Smazat `app/api/selftest/route.ts`.

**Nalezeno mimochodem a opraveno:** `$('body').text()` v cheeriu vrací i obsah `<script>`
a `<style>`. Počítání slov (`content-depth`, brána z kroku F) i detekce SPA v
`app/api/audit/route.ts` proto braly inline JavaScript jako text — prázdná SPA s velkým
`__NEXT_DATA__` se tvářila jako obsáhlá stránka. Obě místa teď skripty před čtením textu
odstraňují.

---

## Průběžný stav

- [x] A — vážený celkový průměr
- [x] B — blokátory
- [x] E — konec dvojího započítání v Rychlosti
- [x] D — spojité skóre
- [x] F — kontext stránky v AEO
- [x] G — jemnější AEO
- [x] C — indexability / noindex
- [x] H — míra jistoty
- [x] I — drobnosti


---

## Výsledek

Ověřeno 129 assertions v `app/api/selftest/route.ts` (route smazána po dokončení; testy
pracovaly s opravdovými kontrolními funkcemi nad fixture HTML, ne s opsanými hodnotami)
plus reálné audity proti asapio.cz, cs.wikipedia.org a example.com.

Změny součtů vah: Rychlost 12 → 9, SEO 23 → 26, AEO 4 → 7, GEO 7, Správnost 6,5 → 6.

Dopad jedné jednotky váhy na celkové skóre — dřív a dnes:

Před: `(weight / Σvah kategorie) × 100 / 5` (prostý průměr pěti kategorií).
Po: `(weight / Σvah kategorie) × váha kategorie / 100`.

| kontrola | před | po |
|---|---|---|
| `lcp` (Rychlost, w3) | 5,00 | 8,33 |
| `title` (SEO, w3) | 2,61 | 3,46 |
| `question-headings` (AEO, w1) | 5,00 | 2,14 |

Nice-to-have kontrola v AEO stála dřív přesně dvakrát tolik co chybějící `title`.
Dnes je to naopak — a nejdražší kontrolou je LCP, jak má být.
