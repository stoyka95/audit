'use client';

import { SECTION_IDS, sectionLabel } from './SiteNav';
import { useLocale } from './LocaleProvider';

export default function SiteFooter() {
  const { t } = useLocale();

  return (
    <footer className="mt-20 pb-10">
      <div className="panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="relative flex h-7 w-7 items-center justify-center">
                <span className="brand-fill absolute inset-0 rounded-[9px] opacity-90" />
                <span className="relative font-display text-[0.72rem] font-bold leading-none text-white">S</span>
              </span>
              <span className="font-display text-[0.95rem] font-semibold tracking-tight text-bone">
                {t.brand}
              </span>
            </div>
            <p className="mt-3 text-[0.8rem] leading-relaxed text-bone-dim">{t.footer.tagline}</p>

            <dl className="mt-5 flex gap-6">
              {t.footer.facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-bone-faint">{fact.label}</dt>
                  <dd className="mt-0.5 font-display text-xl font-semibold tracking-tight text-bone tnum">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <nav aria-label={t.footer.aria} className="grid grid-cols-2 gap-x-10 gap-y-2 sm:gap-x-14">
            <div>
              <p className="eyebrow">{t.footer.contents}</p>
              <ul className="mt-3 space-y-2">
                {SECTION_IDS.map((id) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="text-[0.82rem] tracking-tight text-bone-dim transition-colors hover:text-bone"
                    >
                      {sectionLabel(t, id)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow">{t.footer.sources}</p>
              <ul className="mt-3 space-y-2 text-[0.82rem] tracking-tight text-bone-dim">
                <li>PageSpeed Insights</li>
                <li>Chrome UX Report</li>
                <li>robots.txt · llms.txt</li>
                <li>Schema.org JSON-LD</li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="hairline mt-8 flex flex-col gap-3 pt-5">
          <div className="flex flex-col gap-2 text-[0.72rem] text-bone-faint sm:flex-row sm:items-center sm:justify-between">
            <a
              href="https://semakod.cz"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 text-bone-dim transition-colors hover:text-bone"
            >
              <span aria-hidden="true" className="brand-fill flex h-5 w-5 items-center justify-center rounded-[6px]">
                <span className="font-display text-[0.55rem] font-bold leading-none text-white">S</span>
              </span>
              {t.footer.credit}
            </a>
            <p>{t.footer.copyright}</p>
          </div>

          <div className="flex flex-col gap-2 text-[0.72rem] text-bone-faint sm:flex-row sm:items-center sm:justify-between">
            <p>{t.footer.noteLeft}</p>
            <p>{t.footer.noteRight}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
