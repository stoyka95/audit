'use client';

import { useEffect, useState } from 'react';
import RichText from './RichText';
import { useLocale } from './LocaleProvider';
import type { LoadStep } from '@/lib/types';

const TIP_INTERVAL_MS = 5200;

/** Kroužící satelity kolem jádra — čistě CSS, žádná knihovna. */
function Orbits() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-28 w-28 shrink-0 sm:h-32 sm:w-32">
      {/* Dýchající záře */}
      <span className="absolute inset-2 rounded-full bg-signal/25 blur-xl animate-breathe" />

      {/* Dvě dráhy s různou rychlostí */}
      <span className="absolute inset-0 rounded-full border border-line" />
      <span className="absolute inset-0 animate-orbit-slow">
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-grad-a" />
      </span>

      <span className="absolute inset-[18%] rounded-full border border-line" />
      <span className="absolute inset-[18%] animate-orbit" style={{ animationDirection: 'reverse' }}>
        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-grad-b" />
      </span>

      {/* Jádro */}
      <span className="absolute inset-[34%] flex items-center justify-center rounded-full bg-surface/80 border border-line">
        <span className="h-2 w-2 rounded-full bg-signal animate-pulse-dot" />
      </span>
    </div>
  );
}

/** Ikona podle skutečného stavu kroku — hotovo, běží, čeká, selhalo. */
function StepMark({ state }: { state: LoadStep['state'] }) {
  if (state === 'done') {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-state-pass text-[0.6rem] font-bold text-canvas">
        ✓
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-state-fail text-[0.6rem] font-bold text-canvas">
        ✕
      </span>
    );
  }
  if (state === 'running') {
    return <span className="h-2.5 w-2.5 rounded-full bg-signal animate-pulse-dot" />;
  }
  return <span className="h-2 w-2 rounded-full bg-line" />;
}

export default function LoadingState({ url, steps }: { url: string; steps: LoadStep[] }) {
  const { t } = useLocale();
  const tips = t.loading.tips;
  const [elapsed, setElapsed] = useState(0);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTip((value) => (value + 1) % tips.length), TIP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [tips.length]);

  const current = tips[tip % tips.length];
  const finished = steps.filter((step) => step.state === 'done' || step.state === 'failed').length;
  const progress = Math.round((finished / steps.length) * 100);

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-up">
      <div className="panel overflow-hidden p-6 text-left sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
          <Orbits />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="eyebrow">{t.loading.eyebrow}</p>
            <p className="mt-2 break-all font-display text-2xl font-semibold leading-tight tracking-tight text-bone sm:text-3xl">
              {url}
            </p>

            {/* Pruh ukazuje skutečně dokončené kroky, ne uplynulý čas. */}
            <div className="relative mt-5 h-[3px] overflow-hidden rounded-full bg-line">
              <div
                className="brand-fill absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(progress, 4)}%` }}
              />
            </div>

            <ol className="mt-6 space-y-3.5 text-left">
              {steps.map((step) => (
                <li key={step.id} className="flex items-start gap-3">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
                    <StepMark state={step.state} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm tracking-tight transition-colors ${
                        step.state === 'running'
                          ? 'text-bone'
                          : step.state === 'waiting'
                            ? 'text-bone-faint'
                            : 'text-bone-dim'
                      }`}
                    >
                      {step.label}
                      {step.state === 'running' ? '…' : ''}
                    </span>

                    {/* Běžícímu kroku vysvětlíme, co se děje; hotovému ukážeme výsledek. */}
                    {step.state === 'running' ? (
                      <span className="mt-0.5 block text-[0.75rem] text-bone-faint">{step.hint}</span>
                    ) : null}
                    {step.note ? (
                      <span
                        className={`mt-0.5 block text-[0.75rem] tnum ${
                          step.state === 'failed' ? 'text-state-fail' : 'text-state-pass'
                        }`}
                      >
                        {step.note}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Střídající se tipy. `key` vynutí přehrání animace při každé změně. */}
        <div className="mt-7 min-h-[6.5rem] sm:min-h-[5.5rem]">
          <div key={tip} className="inset-block animate-tip-in p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-signal/12 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-signal">
                {current.tag}
              </span>
              <p className="text-[0.83rem] leading-relaxed text-bone-dim">
                <RichText text={current.text} />
              </p>
            </div>
          </div>

          {/* Tečky ukazují, kolik tipů se ještě prostřídá */}
          <div aria-hidden="true" className="mt-3 flex items-center justify-center gap-1.5">
            {tips.map((item, index) => (
              <span
                key={item.text}
                className={`h-1 rounded-full transition-all duration-500 ${
                  index === tip ? 'w-5 bg-signal' : 'w-1 bg-line'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Časovač. Čekání je dlouhé, tak ať je aspoň vidět, že se počítá. */}
        <div className="hairline mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-5">
          <p className="flex items-end gap-2" role="timer" aria-live="off">
            <span className="brand-text font-display text-[3.4rem] font-semibold leading-[0.85] tracking-tightest tnum sm:text-[4.2rem]">
              {Math.floor(elapsed / 1000)}
            </span>
            <span className="pb-1 text-base font-medium text-bone-dim">{t.loading.seconds}</span>
            <span className="pb-1.5 ml-1 text-[0.68rem] uppercase tracking-[0.2em] text-bone-faint">
              {t.loading.elapsed}
            </span>
          </p>
          <p className="max-w-xs pb-1 text-[0.76rem] leading-relaxed text-bone-faint">
            {t.loading.hint.before}
            <span className="text-bone-dim">{t.loading.hint.fast}</span>
            {t.loading.hint.after}
          </p>
        </div>
      </div>
    </div>
  );
}
