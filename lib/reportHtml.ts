import { BAND_LABEL, scoreBand } from './scoring';
import { formatBytes, formatMs, formatSeconds } from './format';
import type { Locale } from './i18n';
import { ui, type UiDict } from './i18n/ui';
import type { AuditResult, CheckResult, CheckStatus } from './types';

/**
 * Samostatný HTML dokument s reportem, určený k tisku do PDF.
 *
 * Proč ne knihovna na PDF: report je text a tabulky, tedy přesně to, co prohlížeč
 * umí vysázet sám a líp než cokoli, co bychom si přibalili. Tisk do PDF navíc
 * zachová vybíratelný text i odkazy a nestojí ani bajt navíc ve stažené stránce.
 *
 * Dokument je záměrně bez vnějších zdrojů — žádné písmo z CDN, žádné obrázky.
 * Otevírá se do prázdného okna, které dědí CSP hlavní stránky, a všechno, co by
 * se muselo dotáhnout ze sítě, by v něm skončilo zablokované.
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

/** Fatální nález nahoru, pak podle váhy — pořadí v dokumentu je pořadí práce. */
function sortRecommendations(a: CheckResult, b: CheckResult): number {
  if (a.status !== b.status) return a.status === 'fail' ? -1 : 1;
  return b.weight - a.weight;
}

interface Recommendation extends CheckResult {
  category: string;
}

function recommendations(result: AuditResult): Recommendation[] {
  return result.categories
    .flatMap((category) => category.checks.map((check) => ({ ...check, category: category.title })))
    // Informativní řádky (váha 0) se neopravují a mezi doporučení nepatří.
    // Neověřené kontroly taky ne — o těch se nedá nic tvrdit.
    .filter((check) => check.weight > 0 && (check.status === 'fail' || check.status === 'warn'))
    .sort(sortRecommendations);
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

  // Kružnice skóre. Poloměr 52 → obvod 2πr; delší část dráhy zůstane prázdná.
  const circumference = 2 * Math.PI * 52;
  const dash = (circumference * result.overallScore) / 100;

  const chips = [
    `HTTP ${result.meta.statusCode}`,
    result.meta.ttfbMs === null ? null : `TTFB ${formatMs(result.meta.ttfbMs)}`,
    `${formatBytes(result.meta.htmlBytes, locale)} ${t.report.chips.html}`,
    `${t.report.chips.audit} ${formatSeconds(result.durationMs, locale)}`,
    `${Math.round(result.meta.confidence * 100)}${t.report.chips.verifiedShort}`,
  ].filter((chip): chip is string => chip !== null);

  const recs = recommendations(result);

  const passedByCategory = result.categories
    .map((category) => ({
      title: category.title,
      labels: category.checks
        .filter((check) => check.status === 'pass' && check.weight > 0)
        .map((check) => check.label),
    }))
    .filter((group) => group.labels.length > 0);

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.docTitle.replace('%s', host))}</title>
<style>
  :root {
    --ink: #14161c;
    --dim: #545b6d;
    --faint: #858c9d;
    --line: #dfe3ec;
    --inset: #f4f6fb;
    --pass: #12855b;
    --warn: #a46a06;
    --fail: #c22f2a;
    --grad-a: #3a66f6;
    --grad-b: #8e42f0;
  }

  /* Okraje drží tiskárna, ne stránka — jinak by se sazba lišila kus od kusu. */
  @page { size: A4; margin: 14mm 13mm 16mm; }

  * { box-sizing: border-box; }

  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  body {
    margin: 0;
    padding: 28px 22px 40px;
    background: #fff;
    color: var(--ink);
    font: 400 11.5px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    max-width: 190mm;
    margin-inline: auto;
  }

  h1, h2, h3 { margin: 0; font-weight: 650; letter-spacing: -0.02em; }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.92em;
    background: var(--inset);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 0 3px;
  }

  /* Lišta s tlačítkem. Do tisku nepatří, na obrazovce je to jediná ovládací věc. */
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 26px;
    padding: 10px 14px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--inset);
    font-size: 11px;
    color: var(--dim);
  }

  .bar button {
    border: 0;
    border-radius: 999px;
    padding: 8px 16px;
    background: var(--ink);
    color: #fff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .brandline {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--ink);
  }

  .brandline strong { font-size: 13px; letter-spacing: -0.01em; }
  .brandline span { font-size: 10.5px; color: var(--faint); }

  .hero { display: flex; align-items: center; gap: 26px; margin: 22px 0 26px; }
  .hero h1 { font-size: 25px; line-height: 1.15; word-break: break-all; }
  .hero .band { margin: 8px 0 0; font-size: 12px; color: var(--dim); max-width: 105mm; }
  .hero .band b { color: var(--ink); font-weight: 600; }

  .ring { flex: 0 0 auto; position: relative; width: 118px; height: 118px; }
  .ring svg { transform: rotate(-90deg); }
  .ring .value {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
  }
  .ring .value strong { font-size: 32px; letter-spacing: -0.03em; line-height: 1; }
  .ring .value span { font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--faint); }

  .chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 12px 0 0; padding: 0; list-style: none; }
  .chips li {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 9.5px;
    color: var(--dim);
    font-variant-numeric: tabular-nums;
  }

  section { margin-top: 22px; break-inside: avoid; }
  section > h2 {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--faint);
    margin-bottom: 10px;
  }
  section > .lead { margin: -4px 0 12px; font-size: 10.5px; color: var(--dim); max-width: 130mm; }

  .cats { display: grid; grid-template-columns: repeat(6, 1fr); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .cats div { padding: 9px 10px; border-right: 1px solid var(--line); }
  .cats div:last-child { border-right: 0; }
  .cats dt { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--faint); line-height: 1.3; }
  .cats dd { margin: 3px 0 0; font-size: 21px; font-weight: 650; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }

  .blockers { border: 1px solid rgba(194, 47, 42, 0.35); background: rgba(194, 47, 42, 0.05); border-radius: 10px; padding: 14px 16px; }
  .blockers h2 { color: var(--fail); }
  .blockers ul { margin: 0; padding-left: 16px; }
  .blockers li { margin-bottom: 5px; font-size: 11px; color: var(--dim); }
  .blockers li b { color: var(--ink); font-weight: 600; }

  .rec { break-inside: avoid; padding: 11px 0; border-top: 1px solid var(--line); }
  .rec:first-of-type { border-top: 0; padding-top: 0; }
  .rec .top { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .rec .dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; align-self: center; }
  .rec .label { font-size: 12px; font-weight: 600; letter-spacing: -0.01em; }
  .rec .value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 9.5px;
    background: var(--inset);
    border-radius: 4px;
    padding: 1px 5px;
    color: var(--dim);
  }
  .rec .where { margin-left: auto; font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--faint); }
  .rec .detail { margin: 5px 0 0; font-size: 11px; color: var(--dim); max-width: 150mm; }
  .rec .state { font-size: 9.5px; font-weight: 600; }

  .passed { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
  .passed div { break-inside: avoid; }
  .passed h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--faint); }
  .passed p { margin: 3px 0 0; font-size: 10.5px; color: var(--dim); }

  .notes { margin: 0; padding-left: 16px; }
  .notes li { font-size: 10.5px; color: var(--dim); margin-bottom: 4px; }

  /* Levá půlka je delší věta, pravá jen datum — bez omezení šířky by se text
     roztáhl přes celou stránku a datum by spadlo na druhý řádek. */
  footer span:first-child { max-width: 118mm; }

  footer {
    margin-top: 26px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
    font-size: 9.5px;
    color: var(--faint);
    display: flex;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }

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

<div class="brandline">
  <strong>${esc(t.brand)} · Semakod</strong>
  <span>${esc(p.subtitle)}</span>
</div>

<div class="hero">
  <div class="ring">
    <svg width="118" height="118" viewBox="0 0 118 118" aria-hidden="true">
      <circle cx="59" cy="59" r="52" fill="none" stroke="var(--line)" stroke-width="9" />
      <circle cx="59" cy="59" r="52" fill="none" stroke="url(#g)" stroke-width="9"
        stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
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
    <h1>${esc(host)}</h1>
    <p class="band"><b>${esc(BAND_LABEL[locale][band])}.</b> ${esc(t.report.summary[band])}</p>
    <ul class="chips">
      ${chips.map((chip) => `<li>${esc(chip)}</li>`).join('\n      ')}
    </ul>
  </div>
</div>

${
  result.blockers.length > 0
    ? `<section class="blockers">
  <h2>${esc(p.blockers)}</h2>
  <ul>
    ${result.blockers
      .map((blocker) => `<li><b>${esc(blocker.label)}</b> — ${richText(blocker.reason)}</li>`)
      .join('\n    ')}
  </ul>
</section>`
    : ''
}

<section>
  <h2>${esc(p.categories)}</h2>
  <dl class="cats">
    ${result.categories
      .map(
        (category) => `<div>
      <dt>${esc(category.title)}</dt>
      <dd style="color:${
        !category.scored
          ? 'var(--faint)'
          : scoreBand(category.score) === 'poor'
            ? 'var(--fail)'
            : scoreBand(category.score) === 'average'
              ? 'var(--warn)'
              : 'var(--ink)'
      }">${category.scored ? category.score : '—'}</dd>
    </div>`,
      )
      .join('\n    ')}
  </dl>
</section>

<section>
  <h2>${esc(p.recommendations)}</h2>
  <p class="lead">${esc(p.recommendationsLead)}</p>
  ${
    recs.length === 0
      ? `<p class="lead">${esc(p.noRecommendations)}</p>`
      : recs
          .map(
            (rec) => `<article class="rec">
    <div class="top">
      <span class="dot" style="background:${STATUS_COLOR[rec.status]}"></span>
      <span class="label">${esc(rec.label)}</span>
      ${rec.value ? `<span class="value">${esc(rec.value)}</span>` : ''}
      <span class="where">${esc(rec.category)} · ${esc(p.weight)} ${rec.weight}</span>
    </div>
    <p class="detail"><span class="state" style="color:${STATUS_COLOR[rec.status]}">${esc(
      t.check.status[rec.status],
    )}.</span> ${richText(rec.detail)}</p>
  </article>`,
          )
          .join('\n  ')
  }
</section>

${
  passedByCategory.length > 0
    ? `<section>
  <h2>${esc(p.passed)}</h2>
  <div class="passed">
    ${passedByCategory
      .map(
        (group) => `<div>
      <h3>${esc(group.title)}</h3>
      <p>${group.labels.map((label) => esc(label)).join(' · ')}</p>
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
  <ul class="notes">
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
