'use client';

import { useEffect, useState } from 'react';
import { useLocale } from './LocaleProvider';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function SunIcon({ size, className = '' }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1.4v1.4M8 13.2v1.4M14.6 8h-1.4M2.8 8H1.4M12.7 3.3l-1 1M4.3 11.7l-1 1M12.7 12.7l-1-1M4.3 4.3l-1-1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ size, className = '' }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { t } = useLocale();
  // Stav slouží jen popiskům pro odečítače. Vzhled řídí CSS podle atributu
  // data-theme — ten nastaví skript v <head> ještě před prvním vykreslením,
  // takže jezdec je hned na správné straně a nikam se nerozjíždí.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(currentTheme() === 'dark');
  }, []);

  const toggle = () => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Soukromý režim může úložiště zakázat; motiv pak vydrží jen do zavření karty.
    }
    setIsDark(next === 'dark');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? t.theme.toLight : t.theme.toDark}
      title={isDark ? t.theme.light : t.theme.dark}
      className={`group relative flex h-9 w-[4.25rem] shrink-0 items-center rounded-full border border-line
        bg-surface/70 px-1 transition-colors duration-300 hover:border-signal/40 ${className}`}
    >
      {/*
        Jezdec. Dráha = šířka pilulky − rámeček − odsazení na obou stranách − jezdec,
        tedy 4.25rem − 2×1px − 2×0.25rem − 1.75rem = 30 px.
      */}
      <span
        aria-hidden="true"
        className="brand-fill absolute left-1 flex h-7 w-7 items-center justify-center rounded-full
          text-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          dark:translate-x-[calc(2rem-2px)]"
      >
        <SunIcon size={14} className="dark:hidden" />
        <MoonIcon size={14} className="hidden dark:block" />
      </span>

      {/* Nenápadné ikony na pozadí, ať je vidět, kam se přepíná */}
      <span
        aria-hidden="true"
        className="flex w-full items-center justify-between px-[0.45rem] text-bone-faint"
      >
        <SunIcon size={12} />
        <MoonIcon size={12} />
      </span>
    </button>
  );
}
