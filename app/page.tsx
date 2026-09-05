'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import UrlForm from '@/components/UrlForm';
import LoadingState from '@/components/LoadingState';
import ReportView from '@/components/ReportView';
import SiteNav from '@/components/SiteNav';
import AmbientPattern from '@/components/AmbientPattern';
import SiteFooter from '@/components/SiteFooter';
import SectionHeading from '@/components/SectionHeading';
import Reveal from '@/components/Reveal';
import Faq from '@/components/Faq';
import FaqJsonLd from '@/components/FaqJsonLd';
import { useLocale } from '@/components/LocaleProvider';
import { applyBlockerCap, auditConfidence, overallScore, unscoredNote } from '@/lib/scoring';
import type { Locale } from '@/lib/i18n';
import { ui, type UiDict } from '@/lib/i18n/ui';
import { formatBytes, formatMs, formatSeconds } from '@/lib/format';
import type {
  AuditPayload,
  AuditResult,
  CategoryId,
  CategoryResult,
  LoadStep,
  PsiStrategy,
  StepState,
} from '@/lib/types';

type Phase = 'idle' | 'running' | 'done' | 'error';

/**
 * Kolik pokusů na jedno rychlostní měření udělá prohlížeč sám. Lighthouse
 * u Googlu vypadává nepravidelně a na stejné adrese jednou spadne mobil,
 * podruhé počítač — jeden pokus nestačí. Víc než dva ale taky ne: každý
 * neúspěšný pokus prodlužuje čekání o dalších skoro čtyřicet sekund a
 * nedoměřenou kategorii jde kdykoli dohnat tlačítkem přímo v reportu.
 */
const SPEED_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

interface SpeedPayload {
  strategy: PsiStrategy;
  /** Kategorie v obou jazycích, ať jde report přepnout bez nového měření. */
  byLocale: Record<Locale, CategoryResult>;
  available: boolean;
  error: string | null;
  terminal: boolean;
  usedKey: boolean;
  fieldDataAvailable: boolean;
  performanceScore: number | null;
  lcpMs: number | null;
}

/** Výsledek jedné strategie tak, jak ho vidí prohlížeč — i s neúspěchem. */
interface SpeedOutcome {
  strategy: PsiStrategy;
  payload: SpeedPayload | null;
  error: string | null;
}

interface SpeedProgress {
  state: StepState;
  attempt: number;
  note?: string;
}

const SPEED_IDLE: Record<PsiStrategy, SpeedProgress> = {
  mobile: { state: 'waiting', attempt: 0 },
  desktop: { state: 'waiting', attempt: 0 },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Krátké shrnutí měření do řádku průběhu — ať je vidět, co konkrétně vyšlo. */
function speedSummary(payload: SpeedPayload, t: UiDict): string {
  const parts: string[] = [];
  if (payload.performanceScore !== null) parts.push(`Performance ${payload.performanceScore}/100`);
  if (payload.lcpMs !== null) parts.push(`LCP ${formatSeconds(payload.lcpMs)}`);
  parts.push(payload.fieldDataAvailable ? t.loading.steps.fieldData : t.loading.steps.labData);
  return parts.join(' · ');
}

/**
 * Poskládá hotový report z hlavního auditu a obou rychlostních měření.
 *
 * Skládá se to až tady, ne postupně: report se ukazuje jedině kompletní,
 * takže není důvod přepočítávat skóre po každém dílčím výsledku.
 */
function finalizeAudit(
  audit: AuditPayload,
  outcomes: SpeedOutcome[],
  durationMs: number,
  locale: Locale,
): AuditResult {
  const t = ui(locale);
  const device: Record<PsiStrategy, string> = {
    mobile: t.report.missing.mobile,
    desktop: t.report.missing.desktop,
  };
  const say = (cs: string, en: string) => (locale === 'en' ? en : cs);
  const byStrategy = new Map(outcomes.map((outcome) => [outcome.strategy, outcome]));
  const categoryFor: Record<PsiStrategy, CategoryId> = {
    mobile: 'speed-mobile',
    desktop: 'speed-desktop',
  };

  const base = audit.byLocale[locale];

  const categories = base.categories.map((category) => {
    for (const strategy of ['mobile', 'desktop'] as PsiStrategy[]) {
      if (category.id !== categoryFor[strategy]) continue;
      const measured = byStrategy.get(strategy)?.payload?.byLocale[locale];
      if (measured) return measured;
    }
    return category;
  });

  const mobile = byStrategy.get('mobile');
  const desktop = byStrategy.get('desktop');
  const notes = [...base.notes];

  const pairs: [PsiStrategy, SpeedOutcome | undefined][] = [
    ['mobile', mobile],
    ['desktop', desktop],
  ];

  for (const [strategy, outcome] of pairs) {
    if (outcome?.payload?.available) continue;
    const reason =
      outcome?.payload?.error ?? outcome?.error ?? say('Měření se nepodařilo dokončit.', 'The measurement did not complete.');
    notes.push(
      say(
        `Rychlost na ${device[strategy]} se nepodařilo změřit ani na ${SPEED_ATTEMPTS}. pokus. ${reason} ` +
          'Ostatní kategorie tím nejsou ovlivněné. Chybějící část se dá doměřit tlačítkem výš.',
        `Speed on ${device[strategy]} could not be measured even on attempt ${SPEED_ATTEMPTS}. ${reason} ` +
          'The other categories are unaffected. You can run the missing measurement with the button above.',
      ),
    );
  }

  const anyAvailable = Boolean(mobile?.payload?.available || desktop?.payload?.available);
  const anyField = Boolean(mobile?.payload?.fieldDataAvailable || desktop?.payload?.fieldDataAvailable);
  const usedKey = Boolean(mobile?.payload?.usedKey || desktop?.payload?.usedKey);

  if (anyAvailable && !anyField) {
    notes.push(
      say(
        'Pro tuto adresu nejsou v Chrome UX Reportu reálná data uživatelů, hodnotí se laboratorní měření.',
        'The Chrome UX Report has no real-user data for this address, so lab measurements are used.',
      ),
    );
  }
  if (anyAvailable && !usedKey) {
    notes.push(
      say(
        'PageSpeed Insights bylo voláno bez API klíče. Funguje to, ale platí nižší limit požadavků — ' +
          'audit volá měření dvakrát (mobil i počítač), takže se limit vyčerpá rychleji. ' +
          'Doplňte GOOGLE_PAGESPEED_API_KEY.',
        'PageSpeed Insights was called without an API key. It works, but a lower request limit applies — ' +
          'the audit calls the measurement twice (mobile and desktop), so the limit runs out faster. ' +
          'Set GOOGLE_PAGESPEED_API_KEY.',
      ),
    );
  }

  const unscored = unscoredNote(categories, locale);
  if (unscored) notes.push(unscored);

  return {
    ...audit,
    categories,
    blockers: base.blockers,
    durationMs,
    overallScore: applyBlockerCap(overallScore(categories), base.blockers),
    notes,
    meta: {
      ...audit.meta,
      pagespeedUsedKey: usedKey,
      pagespeedMobile: {
        available: Boolean(mobile?.payload?.available),
        error: mobile?.payload?.error ?? mobile?.error ?? null,
      },
      pagespeedDesktop: {
        available: Boolean(desktop?.payload?.available),
        error: desktop?.payload?.error ?? desktop?.error ?? null,
      },
      mobilePending: false,
      desktopPending: false,
      confidence: auditConfidence(categories),
      scoredCategories: categories.filter((category) => category.scored).length,
    },
  };
}

export default function Home() {
  const { locale, t } = useLocale();
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [auditedUrl, setAuditedUrl] = useState('');

  /** Průběh hlavního auditu a obou rychlostních měření pro čekací obrazovku. */
  const [pageStep, setPageStep] = useState<{ state: StepState; note?: string }>({ state: 'waiting' });
  const [speed, setSpeed] = useState<Record<PsiStrategy, SpeedProgress>>(SPEED_IDLE);

  /**
   * Začátek celého čekání. Server zná jen dobu svého požadavku, ale uživatel
   * čeká i na obě rychlostní měření — v reportu má stát ta delší, pravdivá.
   */
  const startedAt = useRef(0);

  /**
   * Podklady pro dopočítání reportu. Odpověď serveru a poslední výsledek každé
   * strategie se drží zvlášť, aby se dal report po doměření složit znovu od
   * začátku — přepisovat hotový výsledek na místě by znamenalo ručně dopočítávat
   * skóre, spolehlivost i poznámky a snadno se rozejít se stavem.
   */
  const baseAudit = useRef<AuditPayload | null>(null);
  const outcomes = useRef<Partial<Record<PsiStrategy, SpeedOutcome>>>({});
  const totalDuration = useRef(0);

  const applyOutcomes = useCallback(() => {
    const base = baseAudit.current;
    if (!base) return;
    const list = (['mobile', 'desktop'] as PsiStrategy[])
      .map((strategy) => outcomes.current[strategy])
      .filter((outcome): outcome is SpeedOutcome => outcome !== undefined);
    setResult(finalizeAudit(base, list, totalDuration.current, locale));
  }, [locale]);

  /**
   * Jedno rychlostní měření včetně opakování.
   *
   * Běží v samostatném požadavku, takže má vlastní rozpočet funkce. Když první
   * pokus vyprší, Google měření na svojí straně dokončí a nacachuje — druhý
   * pokus proto obvykle dorazí během pár sekund. Právě tohle dřív chybělo:
   * obě strategie se dělily o jeden rozpočet a jedna z nich pravidelně spadla.
   */
  const runSpeed = useCallback(
    async (target: string, strategy: PsiStrategy, ttfbMs: number | null): Promise<SpeedOutcome> => {
      let lastError: string | null = null;

      for (let attempt = 1; attempt <= SPEED_ATTEMPTS; attempt += 1) {
        setSpeed((current) => ({ ...current, [strategy]: { state: 'running', attempt } }));

        try {
          const response = await fetch('/api/audit/speed', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url: target, strategy, ttfbMs, attempt, locale }),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const payload = (await response.json()) as SpeedPayload;

          if (payload.available) {
            setSpeed((current) => ({
              ...current,
              [strategy]: { state: 'done', attempt, note: speedSummary(payload, t) },
            }));
            return { strategy, payload, error: null };
          }

          lastError = payload.error;
          // `terminal` = překročený limit nebo adresa, kterou Lighthouse neumí —
          // opakovat by jen zdrželo.
          if (payload.terminal || attempt === SPEED_ATTEMPTS) {
            setSpeed((current) => ({
              ...current,
              [strategy]: { state: 'failed', attempt, note: payload.error ?? undefined },
            }));
            return { strategy, payload, error: payload.error };
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : t.errors.generic;
          if (attempt === SPEED_ATTEMPTS) {
            setSpeed((current) => ({
              ...current,
              [strategy]: { state: 'failed', attempt, note: lastError ?? undefined },
            }));
            return { strategy, payload: null, error: lastError };
          }
        }

        await delay(RETRY_DELAY_MS);
      }

      return { strategy, payload: null, error: lastError };
    },
    [locale, t],
  );

  const runAudit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    startedAt.current = Date.now();
    setPhase('running');
    setResult(null);
    setError(null);
    setAuditedUrl(trimmed);
    setPageStep({ state: 'running' });
    setSpeed(SPEED_IDLE);

    let audit: AuditPayload;
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: trimmed, locale }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setPageStep({ state: 'failed' });
        setError({ message: payload?.error ?? t.errors.generic, detail: payload?.detail });
        setPhase('error');
        return;
      }

      audit = payload as AuditPayload;
    } catch {
      setPageStep({ state: 'failed' });
      setError({ message: t.errors.network, detail: t.errors.networkDetail });
      setPhase('error');
      return;
    }

    const checksDone = audit.byLocale[locale].categories
      .filter((category) => !category.id.startsWith('speed-'))
      .reduce((sum, category) => sum + category.checks.filter((check) => check.weight > 0).length, 0);

    setPageStep({
      state: 'done',
      note: [
        `HTTP ${audit.meta.statusCode}`,
        formatBytes(audit.meta.htmlBytes),
        audit.meta.ttfbMs === null ? null : `TTFB ${formatMs(audit.meta.ttfbMs)}`,
        `${checksDone} ${t.loading.steps.page.checksDone}`,
      ]
        .filter(Boolean)
        .join(' · '),
    });

    // Obě strategie souběžně. Každý požadavek je vlastní instance funkce
    // s vlastním rozpočtem, takže si navzájem neubírají čas.
    const results = await Promise.all([
      runSpeed(audit.url, 'mobile', audit.meta.ttfbMs),
      runSpeed(audit.url, 'desktop', audit.meta.ttfbMs),
    ]);

    baseAudit.current = audit;
    outcomes.current = { mobile: results[0], desktop: results[1] };
    totalDuration.current = Date.now() - startedAt.current;

    applyOutcomes();
    setPhase('done');
  };

  /**
   * Doměření jedné strategie z hotového reportu. Report zůstává na obrazovce,
   * jen se do něj po doběhnutí doplní čísla a přepočítá skóre.
   */
  const retrySpeed = useCallback(
    async (strategy: PsiStrategy) => {
      const base = baseAudit.current;
      if (!base) return;
      const outcome = await runSpeed(base.url, strategy, base.meta.ttfbMs);
      outcomes.current[strategy] = outcome;
      applyOutcomes();
    },
    [runSpeed, applyOutcomes],
  );

  /**
   * Přepnutí jazyka nad hotovým reportem. Data pro oba jazyky už doma jsou,
   * takže se report jen znovu poskládá — žádný nový audit ani měření.
   */
  const shownLocale = useRef<Locale>(locale);
  useEffect(() => {
    if (shownLocale.current === locale) return;
    shownLocale.current = locale;
    if (baseAudit.current) applyOutcomes();
  }, [locale, applyOutcomes]);

  const reset = () => {
    setPhase('idle');
    setResult(null);
    setError(null);
    setPageStep({ state: 'waiting' });
    setSpeed(SPEED_IDLE);
    baseAudit.current = null;
    outcomes.current = {};
  };

  // Kroky pro čekací obrazovku. Stav je skutečný, ne odhad podle času —
  // uživatel tak vidí, co zrovna běží, co doběhlo a s jakým výsledkem.
  const steps: LoadStep[] = [
    {
      id: 'page',
      label: t.loading.steps.page.label,
      hint: t.loading.steps.page.hint,
      state: pageStep.state,
      note: pageStep.note,
    },
    ...(['mobile', 'desktop'] as PsiStrategy[]).map((strategy) => ({
      id: strategy,
      label: strategy === 'mobile' ? t.loading.steps.mobile : t.loading.steps.desktop,
      hint:
        speed[strategy].attempt > 1
          ? `${speed[strategy].attempt}${t.loading.steps.retryHint}`
          : t.loading.steps.speedHint,
      state: speed[strategy].state,
      note: speed[strategy].note,
    })),
  ];

  return (
    <>
      <AmbientPattern busy={phase === 'running'} />
      <SiteNav />

      <main className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6">
        {/* ---------- Audit ---------- */}
        <section id="audit" className="pt-10 sm:pt-16">
          {phase === 'idle' || phase === 'error' ? (
            <div className="py-6 text-center sm:py-10">
              <div className="animate-fade-up">
                <span className="chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-state-pass" />
                  {t.hero.chip}
                </span>
                <h1 className="mx-auto mt-6 max-w-3xl font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tightest text-bone text-balance sm:text-6xl lg:text-[4.1rem]">
                  {t.hero.titleBefore}
                  <span className="brand-text">{t.hero.titleAccent}</span>.
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-[0.95rem] leading-relaxed text-bone-dim text-balance">
                  {t.hero.lead}
                </p>
              </div>

              <div className="mx-auto mt-9 max-w-2xl animate-fade-up" style={{ animationDelay: '80ms' }}>
                <UrlForm value={url} onChange={setUrl} onSubmit={runAudit} />

                {phase === 'error' && error ? (
                  <div className="mt-4 animate-fade-in rounded-2xl border border-state-fail/30 bg-state-fail/[0.08] px-4 py-3 text-left">
                    <p className="text-sm font-medium tracking-tight text-state-fail">{error.message}</p>
                    {error.detail ? <p className="mt-1 text-[0.78rem] text-bone-dim">{error.detail}</p> : null}
                  </div>
                ) : null}

                <p className="mx-auto mt-4 max-w-xl text-[0.72rem] leading-relaxed text-bone-faint text-balance">
                  {t.hero.note}
                </p>
              </div>

              {/* Rychlý přehled kategorií */}
              <div
                className="mt-14 grid animate-fade-up gap-3 text-left sm:grid-cols-3 lg:grid-cols-5"
                style={{ animationDelay: '160ms' }}
              >
                {t.categories.map((category) => (
                  <div key={category.title} className="panel panel-hover p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="font-display text-lg font-semibold leading-none tracking-tight text-bone">
                        {category.title}
                      </h2>
                      <span className="text-[0.65rem] font-medium text-bone-faint tnum">{category.weight}</span>
                    </div>
                    <p className="mt-2 text-[0.73rem] leading-relaxed text-bone-faint">{category.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {phase === 'running' ? (
            <div className="py-10 sm:py-16">
              <LoadingState url={auditedUrl} steps={steps} />
            </div>
          ) : null}

          {phase === 'done' && result ? (
            <div className="py-4 sm:py-6">
              <ReportView
                result={result}
                onReset={reset}
                onRetrySpeed={retrySpeed}
                retrying={{
                  mobile: speed.mobile.state === 'running',
                  desktop: speed.desktop.state === 'running',
                }}
              />
            </div>
          ) : null}
        </section>

        {/* ---------- Jak to funguje ---------- */}
        <section id="jak-to-funguje" className="mt-24 sm:mt-32">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow={t.how.eyebrow}
              title={t.how.title}
              lead={t.how.lead}
            />
          </Reveal>

          <ol className="mt-10 grid gap-3 sm:grid-cols-2">
            {t.how.steps.map((item, index) => (
              <Reveal key={item.step} as="li" delay={index * 60}>
                <div className="panel panel-hover h-full p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center brand-fill rounded-full font-display text-[0.8rem] font-semibold text-white tnum">
                      {item.step}
                    </span>
                    <h3 className="font-display text-[1.05rem] font-semibold tracking-tight text-bone">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-[0.85rem] leading-relaxed text-bone-dim">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ---------- Co kontrolujeme ---------- */}
        <section id="co-kontrolujeme" className="mt-24 sm:mt-32">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow={t.what.eyebrow}
              title={t.what.title}
              lead={t.what.lead}
            />
          </Reveal>

          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {t.categories.map((category, index) => (
              <Reveal
                key={category.title}
                delay={index * 60}
                // Kategorií je pět, mřížka má dva sloupce — poslední karta by
                // jinak zůstala sama v levém sloupci a řada by vypadala uťatě.
                className={index === t.categories.length - 1 ? 'md:col-span-2' : undefined}
              >
                <div className="panel panel-hover h-full p-5 sm:p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-xl font-semibold tracking-tight text-bone">
                      {category.title}
                    </h3>
                    <span className="chip tnum">
                      {category.weight} {t.what.scoreShare}
                    </span>
                  </div>
                  <p className="mt-3 text-[0.85rem] leading-relaxed text-bone-dim">{category.description}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {category.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-line bg-inset/70 px-2.5 py-1 text-[0.7rem] tracking-tight text-bone-dim"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- Doporučení ---------- */}
        <section id="doporuceni" className="mt-24 sm:mt-32">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow={t.advice.eyebrow}
              title={t.advice.title}
              lead={t.advice.lead}
            />
          </Reveal>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {t.advice.items.map((item, index) => (
              <Reveal key={item.title} delay={index * 50}>
                <div className="panel panel-hover h-full p-5">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-signal">
                    {item.tag}
                  </span>
                  <h3 className="mt-2.5 font-display text-[1.02rem] font-semibold leading-snug tracking-tight text-bone">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[0.82rem] leading-relaxed text-bone-dim">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="mt-24 sm:mt-32">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow={t.faq.eyebrow}
              title={t.faq.title}
              lead={t.faq.lead}
            />
          </Reveal>

          <Faq />
          <FaqJsonLd />

          {/* Závěrečná výzva */}
          <Reveal delay={80}>
            <div className="panel panel-strong mt-10 overflow-hidden p-6 text-center sm:p-10">
              <h3 className="font-display text-2xl font-semibold tracking-tightest text-bone text-balance sm:text-3xl">
                {t.cta.title}
              </h3>
              <p className="mx-auto mt-3 max-w-md text-[0.88rem] leading-relaxed text-bone-dim text-balance">
                {t.cta.text}
              </p>
              <a href="#audit" className="btn-primary mt-6 px-6 py-3 text-sm">
                {t.cta.button}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 11.5v-9M3 6.5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </a>
            </div>
          </Reveal>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
