'use client';

import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import { useLocale } from './LocaleProvider';
import type { UiDict } from '@/lib/i18n/ui';

export type SectionId = 'audit' | 'jak-to-funguje' | 'co-kontrolujeme' | 'doporuceni' | 'faq';

/** Kotvy zůstávají české i v anglické verzi — jsou to trvalé adresy, ne text. */
export const SECTION_IDS: SectionId[] = [
  'audit',
  'jak-to-funguje',
  'co-kontrolujeme',
  'doporuceni',
  'faq',
];

export function sectionLabel(t: UiDict, id: SectionId): string {
  switch (id) {
    case 'audit':
      return t.nav.sections.audit;
    case 'jak-to-funguje':
      return t.nav.sections.how;
    case 'co-kontrolujeme':
      return t.nav.sections.what;
    case 'doporuceni':
      return t.nav.sections.advice;
    case 'faq':
      return t.nav.sections.faq;
  }
}

function Logo({ label, aria }: { label: string; aria: string }) {
  return (
    <a href="#audit" className="flex shrink-0 items-center gap-2.5" aria-label={aria}>
      <span aria-hidden="true" className="relative flex h-7 w-7 items-center justify-center">
        <span className="brand-fill absolute inset-0 rounded-[9px] opacity-90" />
        <span className="relative font-display text-[0.72rem] font-bold leading-none text-white">S</span>
      </span>
      <span className="font-display text-[0.95rem] font-semibold tracking-tight text-bone">{label}</span>
    </a>
  );
}

export default function SiteNav() {
  const { t } = useLocale();
  const [active, setActive] = useState<string>(SECTION_IDS[0]);
  const [scrolled, setScrolled] = useState(false);

  // Zvýraznění aktivní sekce. Observer sleduje pás uprostřed obrazovky, takže
  // se odkaz přepne, až sekce opravdu zabírá pohled.
  useEffect(() => {
    const nodes = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (node): node is HTMLElement => node !== null,
    );
    if (nodes.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="sticky top-3 z-50 px-3 sm:top-4 sm:px-4">
      <nav
        aria-label={t.nav.aria}
        className={`mx-auto max-w-5xl rounded-[1.75rem] px-3 py-2 transition-all duration-300 sm:px-4 md:rounded-full ${
          scrolled ? 'glass' : 'border border-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <Logo label={t.brand} aria={t.nav.home} />

          {/* Přepínač jazyka zabral místo, proto se odkazy vejdou vedle loga
              až od lg — pod tím se posunou do rolovatelného pruhu níž. */}
          <ul className="mx-auto hidden items-center gap-0.5 lg:flex">
            {SECTION_IDS.map((id) => (
              <li key={id}>
                <a href={`#${id}`} className="nav-pill" data-active={active === id}>
                  {sectionLabel(t, id)}
                </a>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <a href="#audit" className="btn-primary hidden px-4 py-2 text-[0.82rem] sm:inline-flex">
              {t.nav.cta}
            </a>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <ul className="no-scrollbar -mx-1 mt-1.5 flex items-center gap-0.5 overflow-x-auto px-1 pb-0.5 lg:hidden">
          {SECTION_IDS.map((id) => (
            <li key={id} className="shrink-0">
              <a
                href={`#${id}`}
                className="nav-pill block whitespace-nowrap !px-3 !py-1.5 !text-[0.78rem]"
                data-active={active === id}
              >
                {sectionLabel(t, id)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
