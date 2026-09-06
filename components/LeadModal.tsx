'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from './LocaleProvider';

const STORAGE_KEY = 'lead-modal-dismissed';

/** Ať se okno nevnucuje hned — nejdřív ať si člověk stihne přečíst skóre. */
const SHOW_DELAY_MS = 2500;

interface LeadModalProps {
  /** Roste při každém dokončeném auditu — nová hodnota znovu naplánuje zobrazení. */
  trigger: number;
}

export default function LeadModal({ trigger }: LeadModalProps) {
  const { t } = useLocale();
  const m = t.leadModal;
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (trigger === 0) return;

    let dismissedForGood = false;
    try {
      dismissedForGood = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      // Soukromý režim může úložiště zakázat — okno se pak nabídne znovu i příště.
    }
    if (dismissedForGood) return;

    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [trigger]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const neverShowAgain = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Bez úložiště se volba jednoduše neuloží, okno se objeví i příště.
    }
    setOpen(false);
  };

  // Portál mimo strom stránky: layout obaluje obsah do vlastního stacking
  // contextu (`relative z-[2]`), takže by tenhle z-[70] soupeřil jen v jeho
  // rámci a cookie lišta (mimo ten div) by okno přebila, i s nižším z-indexem.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className="absolute inset-0 animate-fade-in bg-canvas/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        className="panel panel-strong animate-fade-up relative w-full max-w-md rounded-b-none p-5 sm:rounded-3xl sm:p-6"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={() => setOpen(false)}
          aria-label={m.close}
          className="absolute right-4 top-4 shrink-0 rounded-full border border-line p-2 text-bone-faint
            transition-colors hover:border-signal/40 hover:text-bone"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <p className="eyebrow pr-8">{m.eyebrow}</p>
        <h2 id="lead-modal-title" className="mt-1.5 font-display text-xl font-semibold tracking-tight text-bone sm:text-2xl">
          {m.title}
        </h2>
        <p className="mt-2.5 text-[0.85rem] leading-relaxed text-bone-dim">{m.lead}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <a href={`mailto:${m.email}`} className="btn-primary px-4 py-2 text-[0.8rem]">
            {m.cta}
          </a>
          <button
            type="button"
            onClick={neverShowAgain}
            className="ml-auto text-[0.78rem] text-bone-faint underline-offset-2 transition-colors
              hover:text-bone hover:underline"
          >
            {m.neverShow}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
