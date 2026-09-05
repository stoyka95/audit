'use client';

import { useEffect, useState } from 'react';
import { SECTION_IDS, sectionLabel } from './SiteNav';
import BrandLogo from './BrandLogo';
import { useLocale } from './LocaleProvider';

interface StatsResponse {
  /** Už zaokrouhlený počet („500+"), nebo null, když se počítadlo nevede. */
  display: string | null;
  persistent: boolean;
}

/** Odkazy mimo obsah stránky. Adresy jsou stejné pro oba jazyky. */
const EXTERNAL_LINKS: { href: string; label: string; external: boolean }[] = [
  { href: 'https://semakod.cz', label: 'semakod.cz', external: true },
  { href: '/llms.txt', label: 'llms.txt', external: false },
  { href: '/robots.txt', label: 'robots.txt', external: false },
  { href: '/sitemap.xml', label: 'sitemap.xml', external: false },
];

export default function SiteFooter() {
  const { t } = useLocale();

  /**
   * Počet spuštěných auditů. Dokud odpověď nedorazí — nebo když počítadlo nemá
   * kam zapisovat — se dlaždice vůbec nevykreslí. Radši méně čísel než číslo,
   * za kterým nic není.
   */
  const [runs, setRuns] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/stats')
      .then((response) => (response.ok ? (response.json() as Promise<StatsResponse>) : null))
      .then((payload) => {
        if (!cancelled && payload?.display) setRuns(payload.display);
      })
      .catch(() => {
        // Patička kvůli statistice nikoho neobtěžuje chybovou hláškou.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const facts = [
    ...(runs ? [{ label: t.footer.runs.label, value: runs, hint: t.footer.runs.hint }] : []),
    ...t.footer.facts.map((fact) => ({ ...fact, hint: undefined as string | undefined })),
  ];

  return (
    <footer className="mt-20 pb-10">
      <div className="panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-9 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <BrandLogo className="h-7 w-7 shrink-0" />
              <span className="font-display text-[0.95rem] font-semibold tracking-tight text-bone">
                {t.brand}
              </span>
            </div>
            <p className="mt-3 text-[0.8rem] leading-relaxed text-bone-dim">{t.footer.tagline}</p>

            {/* Čísla o nástroji. První dlaždice je živá, ostatní popisují rozsah auditu. */}
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label} title={fact.hint}>
                  <dt className="text-[0.65rem] uppercase leading-tight tracking-[0.16em] text-bone-faint">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 font-display text-xl font-semibold tracking-tight text-bone tnum">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <nav
            aria-label={t.footer.aria}
            className="grid grid-cols-2 gap-x-10 gap-y-7 sm:grid-cols-3 sm:gap-x-14"
          >
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

            <div>
              <p className="eyebrow">{t.footer.links}</p>
              <ul className="mt-3 space-y-2">
                {EXTERNAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      {...(link.external ? { target: '_blank', rel: 'noopener' } : {})}
                      className="text-[0.82rem] tracking-tight text-bone-dim transition-colors hover:text-bone"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="https://semakod.cz/sluzby/"
                    target="_blank"
                    rel="noopener"
                    className="text-[0.82rem] tracking-tight text-bone-dim transition-colors hover:text-bone"
                  >
                    {t.footer.services}
                  </a>
                </li>
                <li>
                  {/* Odvolání souhlasu musí být dostupné stejně snadno jako jeho udělení,
                      takže tady stojí jako běžný odkaz, ne jako drobný text pod čarou. */}
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('cookie-consent:open'))}
                    className="text-left text-[0.82rem] tracking-tight text-bone-dim transition-colors hover:text-bone"
                  >
                    {t.footer.cookieSettings}
                  </button>
                </li>
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
              <BrandLogo className="h-5 w-5 shrink-0" />
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
