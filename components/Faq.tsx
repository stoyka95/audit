'use client';

import { useState } from 'react';
import Reveal from './Reveal';
import { useLocale } from './LocaleProvider';

interface QA {
  q: string;
  a: string;
}

function Item({ item, index }: { item: QA; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const panelId = `faq-panel-${index}`;
  const buttonId = `faq-button-${index}`;

  return (
    <div className="panel overflow-hidden">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors sm:px-6 sm:py-5"
        >
          <span className="flex-1 font-display text-[1rem] font-semibold tracking-tight text-bone sm:text-[1.05rem]">
            {item.q}
          </span>
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line
              text-bone-dim transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      </h3>

      {open ? (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="animate-fade-in px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="max-w-2xl text-[0.86rem] leading-relaxed text-bone-dim">{item.a}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function Faq() {
  const { locale, t } = useLocale();

  return (
    // `key` na jazyku: po přepnutí se položky přemontují, takže se rozbalená
    // otázka vrátí na první — jinak by zůstala otevřená otázka na indexu,
    // který v druhém jazyce nese jiný text.
    <ul key={locale} className="mx-auto mt-8 max-w-3xl space-y-2.5">
      {t.faq.items.map((item, index) => (
        <Reveal key={item.q} as="li" delay={index * 40}>
          <Item item={item} index={index} />
        </Reveal>
      ))}
    </ul>
  );
}
