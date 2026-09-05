'use client';

import { useState } from 'react';
import CheckRow from './CheckRow';
import ScoreRing from './ScoreRing';
import { useLocale } from './LocaleProvider';
import { BAND_LABEL, scoreBand } from '@/lib/scoring';
import type { CategoryResult } from '@/lib/types';

interface CategoryCardProps {
  category: CategoryResult;
  defaultOpen?: boolean;
  index: number;
}

export default function CategoryCard({ category, defaultOpen = false, index }: CategoryCardProps) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);

  // Do souhrnných štítků jdou jen kontroly, které se skutečně bodují. Jinak by
  // karta hlásila „100" a vedle toho „1 ke zlepšení" u řádku s nulovou váhou.
  const counts = category.checks.reduce(
    (acc, check) => {
      if (check.weight === 0) acc.info += 1;
      else acc[check.status] += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0, unknown: 0, info: 0 },
  );

  const bandLabel = category.scored ? BAND_LABEL[locale][scoreBand(category.score)] : t.category.unscored;

  return (
    <section
      className="panel panel-hover animate-fade-up overflow-hidden"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-5 text-left sm:p-6"
      >
        <ScoreRing score={category.score} scored={category.scored} size={64} stroke={5} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="font-display text-xl font-semibold leading-none tracking-tight text-bone">
              {category.title}
            </h3>
            <span className="text-[0.7rem] uppercase tracking-[0.16em] text-bone-faint">{bandLabel}</span>
          </div>
          <p className="mt-1.5 text-[0.78rem] text-bone-dim">{category.subtitle}</p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {counts.pass > 0 ? (
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-state-pass" />
                {counts.pass} {t.category.pass}
              </span>
            ) : null}
            {counts.warn > 0 ? (
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-state-warn" />
                {counts.warn} {t.category.warn}
              </span>
            ) : null}
            {counts.fail > 0 ? (
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-state-fail" />
                {counts.fail} {t.category.fail}
              </span>
            ) : null}
            {counts.unknown > 0 ? (
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-state-unknown" />
                {counts.unknown} {t.category.unknown}
              </span>
            ) : null}
            {counts.info > 0 ? (
              <span className="chip" title={t.category.infoTitle}>
                <span className="h-1.5 w-1.5 rounded-full bg-bone-faint/40" />
                {counts.info} {t.category.info}
              </span>
            ) : null}
          </div>
        </div>

        <span
          aria-hidden="true"
          className={`shrink-0 self-start text-bone-faint transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="animate-fade-in border-t border-line px-4 pb-2 sm:px-5">
          <ul>
            {category.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
