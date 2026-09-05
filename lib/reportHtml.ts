import { brandLogoSvg } from './brandLogo';
import { BAND_LABEL, scoreBand } from './scoring';
import { formatBytes, formatMs, formatSeconds } from './format';
import type { Locale } from './i18n';
import { ui, type UiDict } from './i18n/ui';
import type { AuditResult, CheckResult, CheckStatus } from './types';

/**
 * Samostatný HTML dokument s reportem, určený k tisku do PDF.
 *
 * Proč ne knihovna na PDF: report je text, čísla a karty, tedy přesně to, co
 * prohlížeč umí vysázet sám a líp než cokoli, co bychom si přibalili. Tisk do
 * PDF navíc zachová vybíratelný text i odkazy a nestojí ani bajt navíc ve
 * stažené stránce.
 *
 * Dokument je záměrně bez vnějších zdrojů — žádné písmo z CDN, žádné obrázky.
 * Otevírá se do prázdného okna, které dědí CSP hlavní stránky, a všechno, co by
 * se muselo dotáhnout ze sítě, by v něm skončilo zablokované. Logo je proto
 * vložené jako inline SVG a písmo je systémové.
 */

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPE[char]);
}

/** Stejný zápis kódu jako v rozhraní: text mezi zpětnými apostrofy je `<code>`. */
function richText(value: string): string {
  return esc(value).replace(/`([^`]+)`/g, '<code>$1</code>');
}

const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: 'var(--pass)',
  warn: 'var(--warn)',
  fail: 'var(--fail)',
  unknown: 'var(--faint)',
};

interface Recommendation extends CheckResult {
  category: string;
}

/** Fatální nález nahoru, pak podle váhy — pořadí v dokumentu je pořadí práce. */
function recommendations(result: AuditResult): Recommendation[] {
  return result.categories
    .flatMap((category) => category.checks.map((check) => ({ ...check, category: category.title })))
    // Informativní řádky (váha 0) se neopravují a mezi doporučení nepatří.
    // Neověřené kontroly taky ne — o těch se nedá nic tvrdit.
    .filter((check) => check.weight > 0 && (check.status === 'fail' || check.status === 'warn'))
    .sort((a, b) => (a.status !== b.status ? (a.status === 'fail' ? -1 : 1) : b.weight - a.weight));
}

/**
 * Dokument v tom jazyce, ve kterém je report zrovna na obrazovce. Slovník si
 * bere sám, aby volající nemusel řešit nic než výsledek auditu.
 */
export function buildReportHtml(result: AuditResult, locale: Locale, intl: string): string {
  return renderDocument(result, locale, intl, ui(locale));
}

/** Oddělené vykreslení nad předaným slovníkem — bez sahání po globálním stavu. */
export function renderDocument(
  result: AuditResult,
  locale: Locale,
  intl: string,
  t: UiDict,
): string {
  const p = t.pdf;
  const host = result.finalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const band = scoreBand(result.overallScore);
  const generated = new Date(result.fetchedAt).toLocaleString(intl, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Kružnice skóre. Poloměr 50 → obvod 2πr; zbytek dráhy zůstane prázdný.
  const circumference = 2 * Math.PI * 50;
  const dash = (circumference * result.overallScore) / 100;

  const chips = [
    `HTTP ${result.meta.statusCode}`,
    result.meta.ttfbMs === null ? null : `TTFB ${formatMs(result.meta.ttfbMs)}`,
    `${formatBytes(result.meta.htmlBytes, locale)} ${t.report.chips.html}`,
    `${t.report.chips.audit} ${formatSeconds(result.durationMs, locale)}`,
    `${Math.round(result.meta.confidence * 100)}${t.report.chips.verifiedShort}`,
  ].filter((chip): chip is string => chip !== null);

  const recs = recommendations(result);

  // Souhrn stavů. Počítají se jen bodované kontroly — informativní řádky
  // nejsou ani nález, ani zásluha.
  const scoredChecks = result.categories.flatMap((category) =>
    category.checks.filter((check) => check.weight > 0),
  );
  const tally = {
    fail: scoredChecks.filter((check) => check.status === 'fail').length,
    warn: scoredChecks.filter((check) => check.status === 'warn').length,
    pass: scoredChecks.filter((check) => check.status === 'pass').length,
  };

  const passedByCategory = result.categories
    .map((category) => ({
      title: category.title,
      labels: category.checks
        .filter((check) => check.status === 'pass' && check.weight > 0)
        .map((check) => check.label),
    }))
    .filter((group) => group.labels.length > 0);

  /** Barva čísla kategorie podle pásma — stejná logika jako v reportu na webu. */
  const categoryColor = (scored: boolean, score: number): string => {
    if (!scored) return 'var(--faint)';
    const categoryBand = scoreBand(score);
    if (categoryBand === 'poor') return 'var(--fail)';
    if (categoryBand === 'average') return 'var(--warn)';
    return 'var(--ink)';
  };

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.docTitle.replace('%s', host))}</title>
<style>
  :root {
    --ink: #12141a;
    --dim: #4c5365;
    --faint: #878ea0;
    --line: #e4e8f1;
    --line-soft: #eef1f7;
    --tint: #f7f9fc;
    --pass: #12855b;
    --warn: #a8690a;
    --fail: #c62f2a;
    --grad-a: #3a66f6;
    --grad-b: #8e42f0;
  }

  /* Okraje drží tiskárna, ne stránka — jinak by se sazba lišila kus od kusu. */
  @page { size: A4; margin: 12mm 11mm 14mm; }

  * { box-sizing: border-box; }

  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  body {
    margin: 0 auto;
    padding: 24px 20px 36px;
    max-width: 190mm;
    background: #fff;
    color: var(--ink);
    font: 400 11px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
  }

  h1, h2, h3 { margin: 0; font-weight: 650; letter-spacing: -0.02em; }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.92em;
    background: var(--tint);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 0 3px;
  }

  /* Karta je základní stavební prvek celého dokumentu: zaoblený rám, světlé
     pozadí, nic navíc. Stín se netiskne, takže hranici drží linka. */
  .card {
    border: 1px solid var(--line);
    border-radius: 14px;
    background: #fff;
    break-inside: avoid;
  }

  /* Lišta s tlačítkem. Do tisku nepatří, na obrazovce je to jediné ovládání. */
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 24px;
    padding: 12px 14px 12px 18px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--tint);
    font-size: 10.5px;
    line-height: 1.5;
    color: var(--dim);
  }

  .bar button {
    flex: 0 0 auto;
    border: 0;
    border-radius: 999px;
    padding: 9px 18px;
    background: var(--ink);
    color: #fff;
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  /* Hlavička dokumentu: značka vlevo, čím se web měřil vpravo. */
  .masthead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 8px;
  }

  .masthead .mark { display: flex; align-items: center; gap: 9px; }
  .masthead svg { width: 21px; height: 21px; display: block; }
  .masthead strong { font-size: 12.5px; letter-spacing: -0.01em; }
  .masthead span { font-size: 10px; color: var(--faint); text-align: right; }

  /* Firemní přechod místo obyčejné linky pod hlavičkou. */
  .rule {
    height: 3px;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--grad-a), var(--grad-b));
  }

  /* ---------- souhrn ---------- */

  .hero {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-top: 18px;
    padding: 20px 22px;
    background: linear-gradient(180deg, var(--tint), #fff 70%);
  }

  .hero h1 { font-size: 25px; line-height: 1.12; word-break: break-all; }
  .hero .eyebrow { margin: 0 0 5px; }
  .hero .band { margin: 8px 0 0; font-size: 11.5px; color: var(--dim); max-width: 108mm; }
  .hero .band b { color: var(--ink); font-weight: 600; }

  .eyebrow {
    font-size: 8.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--faint);
  }

  .ring { flex: 0 0 auto; position: relative; width: 114px; height: 114px; }
  .ring svg { transform: rotate(-90deg); display: block; }
  .ring .value {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }
  .ring .value strong { font-size: 33px; letter-spacing: -0.03em; line-height: 1; }
  .ring .value span {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--faint);
  }

  .chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 12px 0 0; padding: 0; list-style: none; }
  .chips li {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 9.5px;
    color: var(--dim);
    background: #fff;
    font-variant-numeric: tabular-nums;
  }

  /* Tři dlaždice se stavem bodovaných kontrol. */
  .tally { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
  .tally div { padding: 11px 14px; border-radius: 12px; border: 1px solid var(--line); }
  .tally dt { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--faint); }
  .tally dd {
    margin: 3px 0 0;
    font-size: 20px;
    font-weight: 650;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  /* ---------- sekce ---------- */

  section { margin-top: 20px; }
  section > h2 {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--faint);
    margin-bottom: 9px;
    break-after: avoid;
  }
  section > .lead { margin: -3px 0 10px; font-size: 10.5px; color: var(--dim); max-width: 132mm; }

  /* ---------- skóre kategorií ---------- */

  /* Počet sloupců nastavuje inline style na .cats — kategorií nemusí být vždy stejně. */
  .cats { display: grid; overflow: hidden; }
  .cats > div { padding: 12px 8px 13px; border-right: 1px solid var(--line-soft); }
  .cats > div:first-child { padding-left: 12px; }
  .cats > div:last-child { padding-right: 12px; border-right: 0; }

  /* Trojřádková výška popisku napevno: bez ní se čísla u delších názvů
     („Rychlost — počítač") propadnou o řádek níž než u ostatních. */
  .cats dt {
    display: block;
    min-height: 3.2em;
    font-size: 7.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.2;
    color: var(--faint);
  }
  .cats dd {
    margin: 2px 0 0;
    font-size: 20px;
    font-weight: 650;
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .cats .track { margin-top: 8px; height: 3px; border-radius: 999px; background: var(--line-soft); }
  .cats .track span { display: block; height: 3px; border-radius: 999px; }

  /* ---------- fatální nálezy ---------- */

  .blockers {
    padding: 15px 18px;
    border-color: rgba(198, 47, 42, 0.32);
    background: rgba(198, 47, 42, 0.045);
  }
  .blockers .eyebrow { color: var(--fail); opacity: 0.75; margin-bottom: 4px; }
  .blockers h3 { font-size: 13px; color: var(--fail); }
  .blockers ul { margin: 9px 0 0; padding-left: 15px; }
  .blockers li { margin-bottom: 5px; font-size: 10.5px; color: var(--dim); }
  .blockers li b { color: var(--ink); font-weight: 600; }
  .blockers li:last-child { margin-bottom: 0; }

  /* ---------- doporučení ---------- */

  .recs { display: flex; flex-direction: column; gap: 8px; }

  /* Barevný proužek vlevo drží prioritu; zaoblení se kvůli němu ořízne. */
  .rec { padding: 13px 16px 14px; border-left-width: 3px; border-left-style: solid; }
  .rec .top { display: flex; align-items: baseline; gap: 8px; }
  .rec .num {
    flex: 0 0 auto;
    min-width: 18px;
    height: 18px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    align-self: center;
  }
  .rec .label { font-size: 12px; font-weight: 600; letter-spacing: -0.01em; }
  .rec .value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 9px;
    background: var(--tint);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 1px 5px;
    color: var(--dim);
  }
  .rec .where {
    margin-left: auto;
    padding-left: 10px;
    flex: 0 0 auto;
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--faint);
    white-space: nowrap;
  }
  .rec .detail { margin: 6px 0 0 26px; font-size: 10.5px; color: var(--dim); }
  .rec .state { font-weight: 600; }

  /* ---------- prošlo bez připomínek ---------- */

  .passed { padding: 6px 16px 14px; }
  .passed > div { break-inside: avoid; padding-top: 11px; }
  /* Kategorie pod sebou potřebují dělítko, jinak štítky jedné splynou s další. */
  .passed > div + div { border-top: 1px solid var(--line-soft); margin-top: 11px; }
  .passed h3 {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--faint);
  }
  .passed ul { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 0; padding: 0; list-style: none; }
  .passed li {
    border: 1px solid var(--line-soft);
    background: var(--tint);
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 9.5px;
    color: var(--dim);
  }

  /* ---------- poznámky ---------- */

  .notes { padding: 13px 18px 13px 30px; margin: 0; }
  .notes li { font-size: 10.5px; color: var(--dim); margin-bottom: 4px; }
  .notes li::marker { color: var(--faint); }
  .notes li:last-child { margin-bottom: 0; }

  /* ---------- patička ---------- */

  footer {
    margin-top: 22px;
    padding-top: 11px;
    border-top: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    font-size: 9px;
    color: var(--faint);
  }
  footer span:first-child { max-width: 120mm; }
  footer span:last-child { white-space: nowrap; }

  @media print {
    body { padding: 0; }
    .bar { display: none; }
  }
</style>
</head>
<body>

<div class="bar">
  <span>${esc(p.printHint)}</span>
  <button type="button" onclick="window.print()">${esc(p.print)}</button>
</div>

<header class="masthead">
  <span class="mark">
    ${brandLogoSvg('pdf-brand')}
    <strong>${esc(t.brand)} · Semakod</strong>
  </span>
  <span>${esc(p.subtitle)}<br>audit.semakod.cz</span>
</header>
<div class="rule"></div>

<div class="card hero">
  <div class="ring">
    <svg width="114" height="114" viewBox="0 0 114 114" aria-hidden="true">
      <circle cx="57" cy="57" r="50" fill="none" stroke="var(--line)" stroke-width="8" />
      <circle cx="57" cy="57" r="50" fill="none" stroke="url(#score)" stroke-width="8"
        stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" />
      <defs>
        <linearGradient id="score" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#3a66f6" />
          <stop offset="100%" stop-color="#8e42f0" />
        </linearGradient>
      </defs>
    </svg>
    <div class="value">
      <strong>${result.overallScore}</strong>
      <span>${esc(t.report.total)}</span>
    </div>
  </div>

  <div>
    <p class="eyebrow">${esc(p.eyebrow)}</p>
    <h1>${esc(host)}</h1>
    <p class="band"><b>${esc(BAND_LABEL[locale][band])}.</b> ${esc(t.report.summary[band])}</p>
    <ul class="chips">
      ${chips.map((chip) => `<li>${esc(chip)}</li>`).join('\n      ')}
    </ul>
  </div>
</div>

<dl class="tally">
  <div style="border-color:rgba(198,47,42,0.3);background:rgba(198,47,42,0.05)">
    <dt>${esc(p.summary.fail)}</dt>
    <dd style="color:var(--fail)">${tally.fail}</dd>
  </div>
  <div style="border-color:rgba(168,105,10,0.3);background:rgba(168,105,10,0.05)">
    <dt>${esc(p.summary.warn)}</dt>
    <dd style="color:var(--warn)">${tally.warn}</dd>
  </div>
  <div style="border-color:rgba(18,133,91,0.3);background:rgba(18,133,91,0.05)">
    <dt>${esc(p.summary.pass)}</dt>
    <dd style="color:var(--pass)">${tally.pass}</dd>
  </div>
</dl>

${
  result.blockers.length > 0
    ? `<section>
  <div class="card blockers">
    <p class="eyebrow">${esc(
      result.blockers.length === 1 ? t.report.blockers.one : t.report.blockers.many,
    )}</p>
    <h3>${esc(t.report.blockers.title)}</h3>
    <ul>
      ${result.blockers
        .map((blocker) => `<li><b>${esc(blocker.label)}</b> — ${richText(blocker.reason)}</li>`)
        .join('\n      ')}
    </ul>
  </div>
</section>`
    : ''
}

<section>
  <h2>${esc(p.categories)}</h2>
  <dl class="card cats" style="grid-template-columns:repeat(${result.categories.length},1fr)">
    ${result.categories
      .map((category) => {
        const color = categoryColor(category.scored, category.score);
        return `<div>
      <dt>${esc(category.title)}</dt>
      <dd style="color:${color}">${category.scored ? category.score : '—'}</dd>
      <div class="track"><span style="width:${
        category.scored ? category.score : 0
      }%;background:${color}"></span></div>
    </div>`;
      })
      .join('\n    ')}
  </dl>
</section>

<section>
  <h2>${esc(p.recommendations)}</h2>
  <p class="lead">${esc(p.recommendationsLead)}</p>
  ${
    recs.length === 0
      ? `<div class="card" style="padding:14px 18px;font-size:10.5px;color:var(--dim)">${esc(
          p.noRecommendations,
        )}</div>`
      : `<div class="recs">
    ${recs
      .map((rec, index) => {
        const color = STATUS_COLOR[rec.status];
        const tintColor = rec.status === 'fail' ? 'rgba(198,47,42,0.09)' : 'rgba(168,105,10,0.11)';
        return `<article class="card rec" style="border-left-color:${color}">
      <div class="top">
        <span class="num" style="background:${tintColor};color:${color}">${index + 1}</span>
        <span class="label">${esc(rec.label)}</span>
        ${rec.value ? `<span class="value">${esc(rec.value)}</span>` : ''}
        <span class="where">${esc(rec.category)} · ${esc(p.weight)} ${rec.weight}</span>
      </div>
      <p class="detail"><span class="state" style="color:${color}">${esc(
        t.check.status[rec.status],
      )}.</span> ${richText(rec.detail)}</p>
    </article>`;
      })
      .join('\n    ')}
  </div>`
  }
</section>

${
  passedByCategory.length > 0
    ? `<section>
  <h2>${esc(p.passed)}</h2>
  <div class="card passed">
    ${passedByCategory
      .map(
        (group) => `<div>
      <h3>${esc(group.title)}</h3>
      <ul>${group.labels.map((label) => `<li>${esc(label)}</li>`).join('')}</ul>
    </div>`,
      )
      .join('\n    ')}
  </div>
</section>`
    : ''
}

${
  result.notes.length > 0
    ? `<section>
  <h2>${esc(p.notes)}</h2>
  <ul class="card notes">
    ${result.notes.map((note) => `<li>${esc(note)}</li>`).join('\n    ')}
  </ul>
</section>`
    : ''
}

<footer>
  <span>${esc(p.footer)}</span>
  <span>${esc(p.generated)}: ${esc(generated)}</span>
</footer>

</body>
</html>`;
}
