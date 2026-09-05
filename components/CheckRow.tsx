'use client';

import { useId, useState } from 'react';
import RichText from './RichText';
import { useLocale } from './LocaleProvider';
import type { UiDict } from '@/lib/i18n/ui';
import type { BotRow, BotState, CheckResult, CheckStatus } from '@/lib/types';

const STATUS_STYLE: Record<CheckStatus, { dot: string; text: string; glyph: string; tint: string }> = {
  pass: { dot: 'bg-state-pass', text: 'text-state-pass', glyph: '✓', tint: 'bg-state-pass/[0.07]' },
  warn: { dot: 'bg-state-warn', text: 'text-state-warn', glyph: '!', tint: 'bg-state-warn/[0.09]' },
  fail: { dot: 'bg-state-fail', text: 'text-state-fail', glyph: '✕', tint: 'bg-state-fail/[0.08]' },
  unknown: { dot: 'bg-state-unknown', text: 'text-state-unknown', glyph: '?', tint: 'bg-inset/60' },
};

const BOT_STATE_STYLE: Record<BotState, string> = {
  allowed: 'text-state-pass',
  disallowed: 'text-state-fail',
  partial: 'text-state-warn',
  unmentioned: 'text-bone-dim',
  unknown: 'text-state-unknown',
};

function BotTable({ rows, t }: { rows: BotRow[]; t: UiDict }) {
  const groups: { key: 'search' | 'training'; title: string; hint: string }[] = [
    { key: 'search', title: t.check.bots.search, hint: t.check.bots.searchHint },
    { key: 'training', title: t.check.bots.training, hint: t.check.bots.trainingHint },
  ];

  return (
    <div className="mt-4 space-y-5">
      {groups.map((group) => {
        const groupRows = rows.filter((row) => row.category === group.key);
        if (groupRows.length === 0) return null;
        return (
          <div key={group.key}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h5 className="text-xs font-semibold tracking-tight text-bone">{group.title}</h5>
              <span className="text-[0.7rem] text-bone-faint">{group.hint}</span>
            </div>
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-inset">
              {groupRows.map((row) => (
                <li key={row.bot} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[0.78rem] text-bone">{row.bot}</span>
                    <span className="ml-2 text-[0.7rem] text-bone-faint">{row.vendor}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {row.rule ? (
                      <span className="hidden text-[0.68rem] text-bone-faint sm:inline">{row.rule}</span>
                    ) : null}
                    <span className={`text-[0.72rem] font-medium ${BOT_STATE_STYLE[row.state]}`}>
                      {t.check.bots[row.state]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function MetaBlock({ check, t }: { check: CheckResult; t: UiDict }) {
  const meta = check.meta;
  if (!meta) return null;

  if (meta.kind === 'bots') return <BotTable rows={meta.rows} t={t} />;

  if (meta.kind === 'list') {
    return (
      <ul className="mt-3 space-y-1.5">
        {meta.items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="break-all rounded-lg bg-inset px-3 py-1.5 font-mono text-[0.72rem] text-bone-dim"
          >
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="mt-3 space-y-1.5">
      {meta.items.map((item) => (
        <li
          key={item.url}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-inset px-3 py-1.5"
        >
          <span className="text-[0.72rem] font-semibold text-state-fail">{item.status ?? t.check.error}</span>
          <span className="break-all font-mono text-[0.72rem] text-bone-dim">{item.url}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CheckRow({ check }: { check: CheckResult }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const style = STATUS_STYLE[check.status];
  const statusLabel = t.check.status[check.status];

  /*
    Zvýrazněný řádek. Souhrnné Performance skóre je jediné číslo z celé
    kategorie, které lidé znají odjinud (z PageSpeedu, z Lighthouse), a mezi
    ostatními řádky zanikalo. Dostane proto barevný podklad a hodnotu vysázenou
    velkým písmem místo drobného štítku.
  */
  if (check.featured) {
    return (
      <li className="hairline first:border-t-0">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className={`group flex w-full items-center gap-4 rounded-xl px-3 py-3.5 text-left transition-colors
            ${style.tint} hover:brightness-[0.98] sm:px-4`}
        >
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold text-canvas ${style.dot}`}
          >
            {style.glyph}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[0.82rem] font-medium tracking-tight text-bone">{check.label}</span>
            <span className={`mt-0.5 block text-[0.72rem] ${style.text}`}>
              <span className="sr-only">{t.check.statePrefix}</span>
              {statusLabel}
            </span>
          </span>

          {check.value ? (
            <span className="shrink-0 text-right">
              <span
                className={`font-display text-3xl font-semibold leading-none tracking-tight tnum sm:text-4xl ${style.text}`}
              >
                {check.value.split('/')[0]}
              </span>
              {check.value.includes('/') ? (
                <span className="ml-0.5 text-[0.8rem] font-medium text-bone-faint tnum">
                  /{check.value.split('/')[1]}
                </span>
              ) : null}
            </span>
          ) : null}

          <span
            aria-hidden="true"
            className={`shrink-0 text-bone-faint transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
        </button>

        {open ? (
          <div id={panelId} className="animate-fade-in px-3 pb-4 pt-2 sm:px-4">
            <p className="max-w-prose text-[0.82rem] leading-relaxed text-bone-dim">
              <RichText text={check.detail} />
            </p>
            <MetaBlock check={check} t={t} />
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <li className="hairline first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="group flex w-full items-start gap-3 px-1 py-3 text-left transition-colors hover:bg-inset/60 sm:px-2"
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-canvas ${style.dot}`}
        >
          {style.glyph}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[0.9rem] font-medium tracking-tight text-bone">{check.label}</span>
            {check.value ? (
              <span className="rounded-md bg-inset px-1.5 py-0.5 font-mono text-[0.68rem] text-bone-dim tnum">
                {check.value}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.7rem]">
            <span className={style.text}>
              <span className="sr-only">{t.check.statePrefix}</span>
              {statusLabel}
            </span>
            {check.weight === 0 ? (
              <span className="text-bone-faint" title={t.check.notScoredTitle}>
                {t.check.notScored}
              </span>
            ) : null}
          </span>
        </span>

        <span
          aria-hidden="true"
          className={`mt-1 shrink-0 text-bone-faint transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div id={panelId} className="animate-fade-in pb-4 pl-9 pr-1 sm:pr-2">
          <p className="max-w-prose text-[0.82rem] leading-relaxed text-bone-dim">
            <RichText text={check.detail} />
          </p>
          <MetaBlock check={check} t={t} />
        </div>
      ) : null}
    </li>
  );
}
