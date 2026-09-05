'use client';

import { useCallback, useState } from 'react';
import CategoryCard from './CategoryCard';
import RichText from './RichText';
import ScoreRing from './ScoreRing';
import { useLocale } from './LocaleProvider';
import { BAND_LABEL, BLOCKER_SCORE_CAP, scoreBand } from '@/lib/scoring';
import { formatBytes, formatMs, formatSeconds } from '@/lib/format';
import { buildReportHtml } from '@/lib/reportHtml';
import type { AuditResult, PsiStrategy } from '@/lib/types';

function topIssues(result: AuditResult) {
  return result.categories
    .flatMap((category) => category.checks.map((check) => ({ ...check, category: category.title })))
    // Informativní řádky (váha 0) sem nepatří — nedají se „opravit" a jen by
    // odsunuly skutečné nálezy. Typicky souhrnné PageSpeed skóre.
    .filter((check) => check.status === 'fail' && check.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);
}

interface ReportViewProps {
  result: AuditResult;
  onReset: () => void;
  /** Doměří jednu strategii a doplní ji do hotového reportu. */
  onRetrySpeed: (strategy: PsiStrategy) => void;
  retrying: Record<PsiStrategy, boolean>;
}

export default function ReportView({ result, onReset, onRetrySpeed, retrying }: ReportViewProps) {
  const { locale, intl, t } = useLocale();
  /** Vyplní se jen tehdy, když prohlížeč nepustí nové okno — jinak zůstává prázdné. */
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * Report do PDF. Sestaví se samostatný HTML dokument, otevře se v novém okně
   * a rovnou se nabídne tisk — v dialogu stačí zvolit „Uložit jako PDF".
   *
   * Nic se neposílá na server: dokument vzniká z dat, která už prohlížeč má,
   * takže se auditovaná adresa nedostane nikam dál a export funguje i offline.
   */
  const saveAsPdf = useCallback(() => {
    const html = buildReportHtml(result, locale, intl);
    const win = window.open('', '_blank');

    if (!win) {
      setExportError(t.pdf.popupBlocked);
      return;
    }

    setExportError(null);
    win.document.open();
    win.document.write(html);
    win.document.close();

    // Krátká prodleva před dialogem: bez ní některé prohlížeče otevřou tisk
    // ještě nad prázdnou stránkou a nabídnou k uložení bílý list.
    const print = () => {
      win.focus();
      win.print();
    };
    if (win.document.readyState === 'complete') window.setTimeout(print, 150);
    else win.addEventListener('load', () => window.setTimeout(print, 150), { once: true });
  }, [result, locale, intl, t]);

  const speedLabel: Record<PsiStrategy, string> = {
    mobile: t.report.missing.mobile,
    desktop: t.report.missing.desktop,
  };
  // Měření, která nedoběhla. Nabízíme je doměřit, protože Lighthouse u Googlu
  // vypadává nepravidelně a druhý pokus po chvíli obvykle projde.
  const missing = (['mobile', 'desktop'] as PsiStrategy[]).filter((strategy) =>
    strategy === 'mobile' ? !result.meta.pagespeedMobile.available : !result.meta.pagespeedDesktop.available,
  );

  const band = scoreBand(result.overallScore);
  const issues = topIssues(result);
  const fetchedAt = new Date(result.fetchedAt).toLocaleString(intl, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full">
      {/* Fatální nálezy — zastropují celkové skóre */}
      {result.blockers.length > 0 ? (
        <section
          className="animate-fade-up mb-4 overflow-hidden rounded-2xl border border-state-fail/35 bg-state-fail/[0.09] p-5 sm:p-6"
          role="alert"
        >
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-state-fail">
            {result.blockers.length === 1 ? t.report.blockers.one : t.report.blockers.many}
          </p>
          <p className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight text-bone sm:text-2xl">
            {t.report.blockers.title}
          </p>
          <ul className="mt-4 space-y-2.5">
            {result.blockers.map((blocker) => (
              <li key={blocker.id} className="flex gap-2.5 text-[0.82rem] leading-relaxed text-bone-dim">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-state-fail" />
                <span>
                  <span className="text-bone">{blocker.label}</span> — <RichText text={blocker.reason} />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[0.72rem] leading-relaxed text-bone-faint">
            {t.report.blockers.capBefore}
            {BLOCKER_SCORE_CAP}
            {t.report.blockers.capAfter}
          </p>
        </section>
      ) : null}

      {/* Souhrn */}
      <section className="panel animate-fade-up overflow-hidden p-6 sm:p-9">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:gap-9">
          <ScoreRing score={result.overallScore} size={148} stroke={9} label={t.report.total} />

          <div className="min-w-0 flex-1">
            <p className="eyebrow">{t.report.eyebrow}</p>
            <h2 className="mt-2 break-all font-display text-3xl font-semibold leading-[1.08] tracking-tightest text-bone sm:text-[2.4rem]">
              {result.finalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-bone-dim text-balance">
              <span className="text-bone">{BAND_LABEL[locale][band]}.</span> {t.report.summary[band]}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              <span className="chip tnum">{fetchedAt}</span>
              <span className="chip tnum">HTTP {result.meta.statusCode}</span>
              {result.meta.ttfbMs !== null ? (
                <span className="chip tnum">TTFB {formatMs(result.meta.ttfbMs)}</span>
              ) : null}
              <span className="chip tnum">
                {formatBytes(result.meta.htmlBytes, locale)} {t.report.chips.html}
              </span>
              <span className="chip tnum">
                {t.report.chips.audit} {formatSeconds(result.durationMs, locale)}
              </span>
              <span
                className="chip tnum"
                title={t.report.chips.confidenceTitle}
              >
                {result.meta.scoredCategories === result.meta.totalCategories
                  ? `${Math.round(result.meta.confidence * 100)}${t.report.chips.verified}`
                  : `${result.meta.scoredCategories}/${result.meta.totalCategories} ${t.report.chips.ofCategories} · ${Math.round(result.meta.confidence * 100)}${t.report.chips.verifiedShort}`}
              </span>
            </div>
          </div>

          {/* Dvě akce, které má člověk s hotovým reportem udělat: uložit si ho,
              nebo pustit další audit. Obě proto vypadají jako tlačítka, ne jako
              odkaz stranou — dřív se nenápadné „Nový audit" přehlíželo. */}
          <div className="flex shrink-0 flex-col gap-2 sm:self-center">
            <button
              type="button"
              onClick={onReset}
              className="btn-primary w-full px-5 py-2.5 text-sm sm:w-auto"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M12 7a5 5 0 1 1-1.6-3.7M12 1.6V4h-2.4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t.report.reset}
            </button>

            <button
              type="button"
              onClick={saveAsPdf}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border
                border-signal/45 bg-signal/[0.09] px-5 py-2.5 text-sm font-medium tracking-tight text-bone
                transition-colors duration-200 hover:border-signal/70 hover:bg-signal/[0.16] sm:w-auto"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M7 1.5v7.5M4 6.2 7 9.2l3-3M2 10.5v1.2c0 .4.3.8.8.8h8.4c.5 0 .8-.4.8-.8v-1.2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t.pdf.button}
            </button>
          </div>
        </div>

        {/* Pruh kategorií */}
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-7">
          {result.categories.map((category) => (
            <div key={category.id} className="bg-surface/70 px-4 py-4">
              <p className="text-[0.68rem] uppercase leading-tight tracking-[0.16em] text-bone-faint">
                {category.title}
              </p>
              <p
                className={`mt-1 font-display text-3xl font-semibold leading-none tracking-tight tnum ${
                  !category.scored
                    ? 'text-state-unknown'
                    : scoreBand(category.score) === 'poor'
                      ? 'text-state-fail'
                      : scoreBand(category.score) === 'average'
                        ? 'text-state-warn'
                        : 'text-bone'
                }`}
              >
                {category.scored ? category.score : '—'}
              </p>
            </div>
          ))}
        </div>

        {exportError ? (
          <p className="mt-4 text-[0.78rem] leading-relaxed text-state-warn">{exportError}</p>
        ) : null}
      </section>

      {/* Nedokončená měření — dají se doměřit bez opakování celého auditu */}
      {missing.length > 0 ? (
        <section className="panel animate-fade-up mt-4 border-state-warn/25 p-5 sm:p-6">
          <p className="eyebrow">{t.report.missing.eyebrow}</p>
          <p className="mt-2 max-w-2xl text-[0.85rem] leading-relaxed text-bone-dim">
            {missing.length === 1
              ? t.report.missing.one.replace('%s', speedLabel[missing[0]])
              : t.report.missing.both}{' '}
            {t.report.missing.explain}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {missing.map((strategy) => (
              <button
                key={strategy}
                type="button"
                onClick={() => onRetrySpeed(strategy)}
                disabled={retrying[strategy]}
                className="btn-primary px-5 py-2.5 text-[0.82rem] disabled:cursor-wait disabled:bg-line
                  disabled:text-bone-faint disabled:shadow-none"
              >
                {retrying[strategy] ? (
                  <>
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current animate-pulse-dot" />
                    {t.report.missing.running.replace('%s', speedLabel[strategy])}
                  </>
                ) : (
                  t.report.missing.button.replace('%s', speedLabel[strategy])
                )}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Nejzávažnější nálezy */}
      {issues.length > 0 ? (
        <section className="panel animate-fade-up mt-4 p-6 sm:p-7" style={{ animationDelay: '60ms' }}>
          <p className="eyebrow">{t.report.issues}</p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {issues.map((issue) => (
              <li
                key={`${issue.category}-${issue.id}`}
                className="flex items-start gap-2.5 rounded-xl border border-state-fail/20 bg-state-fail/[0.06] px-3.5 py-3"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-state-fail" />
                <span className="min-w-0">
                  <span className="block text-[0.85rem] font-medium tracking-tight text-bone">{issue.label}</span>
                  <span className="text-[0.7rem] uppercase tracking-[0.14em] text-bone-faint">{issue.category}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Poznámky k měření */}
      {result.notes.length > 0 ? (
        <section className="panel animate-fade-up mt-4 p-5 sm:p-6" style={{ animationDelay: '90ms' }}>
          <p className="eyebrow">{t.report.notes}</p>
          <ul className="mt-3 space-y-2">
            {result.notes.map((note) => (
              <li key={note} className="flex gap-2.5 text-[0.78rem] leading-relaxed text-bone-dim">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-bone-faint" />
                {note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Kategorie */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {result.categories.map((category, index) => (
          // Karty jsou po dokončení auditu rozbalené. Report je výsledek, ne rozcestník —
          // rozklikávat každou kategorii zvlášť, aby člověk zjistil, co konkrétně nesedí, byla otrava.
          <CategoryCard key={category.id} category={category} index={index} defaultOpen />
        ))}
      </div>
    </div>
  );
}
