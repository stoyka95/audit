'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from './LocaleProvider';
import GoogleTagManager from './GoogleTagManager';

/** Uložená volba. `analytics` je jediná věc, o které se rozhoduje — nezbytné položky souhlas nevyžadují. */
interface StoredConsent {
  v: 1;
  analytics: boolean;
  /** Kdy volba padla. Podle toho se pozná souhlas starší než rok. */
  at: string;
}

const STORAGE_KEY = 'cookie-consent';

/**
 * Jak dlouho volba platí. Doporučení dozorových úřadů se drží zhruba roku —
 * souhlas z roku 2025 nemá tiše platit v roce 2027, takže se po dvanácti
 * měsících lišta objeví znovu.
 */
const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/** Patička posílá tuhle událost, aby šlo nastavení otevřít i po volbě —
 * s CookieConsent nesdílí žádný kontext, jen totéž okno. */
const REOPEN_EVENT = 'cookie-consent:open';

/**
 * Načte volbu z úložiště. Zvládne i starší tvar (`'accepted'` / `'rejected'`),
 * který se ukládal předtím, než přibylo datum a rozdělení podle kategorií.
 */
function readConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    if (raw === 'accepted' || raw === 'rejected') {
      // Bez data nejde poznat stáří, takže se bere jako čerstvé a doplní se teď.
      return { v: 1, analytics: raw === 'accepted', at: new Date().toISOString() };
    }

    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (typeof parsed?.analytics !== 'boolean' || typeof parsed.at !== 'string') return null;

    const age = Date.now() - new Date(parsed.at).getTime();
    if (!Number.isFinite(age) || age > CONSENT_TTL_MS) return null;

    return { v: 1, analytics: parsed.analytics, at: parsed.at };
  } catch {
    return null;
  }
}

/**
 * Souhlas je defaultně prázdný — dokud návštěvník nerozhodne, Tag Manager se
 * vůbec nenačte (opt-in, ne sledování předem s možností se odhlásit).
 */
export default function CookieConsent() {
  const { t } = useLocale();
  const m = t.cookie.modal;

  const [consent, setConsent] = useState<StoredConsent | null>(null);
  const [barVisible, setBarVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  /** Přepínač v okně, dokud se volba neuloží. */
  const [analyticsDraft, setAnalyticsDraft] = useState(false);

  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    setBarVisible(stored === null);
    setAnalyticsDraft(stored?.analytics ?? false);

    // Z patičky se otevírá rovnou podrobné nastavení, ne lišta — kdo na odkaz
    // klikne, chce volbu změnit, ne si znovu přečíst dvě věty.
    const reopen = () => {
      setAnalyticsDraft(readConsent()?.analytics ?? false);
      setModalOpen(true);
    };
    window.addEventListener(REOPEN_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_EVENT, reopen);
  }, []);

  const decide = useCallback((analytics: boolean) => {
    const next: StoredConsent = { v: 1, analytics, at: new Date().toISOString() };
    setConsent(next);
    setAnalyticsDraft(analytics);
    setBarVisible(false);
    setModalOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Soukromý režim může úložiště zakázat; volba pak platí jen pro tuhle návštěvu.
    }
  }, []);

  // Zavření klávesou a zámek rolování pod oknem. Bez zámku se pod modálem roluje
  // stránka a na mobilu se pak nedá dostat zpátky nahoru k tlačítkům.
  useEffect(() => {
    if (!modalOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [modalOpen]);

  return (
    <>
      {consent?.analytics ? <GoogleTagManager /> : null}

      {/* ---------- lišta ---------- */}
      {barVisible && !modalOpen ? (
        <div
          role="region"
          aria-label={t.cookie.aria}
          className="fixed inset-x-3 bottom-3 z-[60] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-md"
        >
          <div className="panel panel-strong animate-fade-up p-4 sm:p-5">
            <p className="font-display text-[0.95rem] font-semibold tracking-tight text-bone">
              {t.cookie.title}
            </p>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-bone-dim">{t.cookie.text}</p>

            {/* Přijmout a odmítnout mají schválně stejnou váhu — odmítnutí nesmí
                být schované za druhým klikem ani vypadat jako méně důležité. */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => decide(true)}
                className="btn-primary px-4 py-2 text-[0.8rem]"
              >
                {t.cookie.accept}
              </button>
              <button
                type="button"
                onClick={() => decide(false)}
                className="btn-ghost px-4 py-2 text-[0.8rem]"
              >
                {t.cookie.reject}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="ml-auto text-[0.78rem] text-bone-faint underline-offset-2 transition-colors
                  hover:text-bone hover:underline"
              >
                {t.cookie.more}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- podrobné informace ---------- */}
      {modalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            aria-hidden="true"
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 animate-fade-in bg-canvas/70 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-modal-title"
            className="panel panel-strong animate-fade-up relative flex max-h-[92vh] w-full max-w-2xl
              flex-col overflow-hidden rounded-b-none sm:rounded-3xl"
          >
            <header className="flex items-start gap-4 border-b border-line p-5 sm:p-6">
              <div className="min-w-0 flex-1">
                <p className="eyebrow">{m.updated}</p>
                <h2
                  id="cookie-modal-title"
                  className="mt-1.5 font-display text-xl font-semibold tracking-tight text-bone sm:text-2xl"
                >
                  {m.title}
                </h2>
                <p className="mt-2 text-[0.8rem] leading-relaxed text-bone-dim">{m.lead}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label={m.close}
                className="shrink-0 rounded-full border border-line p-2 text-bone-faint transition-colors
                  hover:border-signal/40 hover:text-bone"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              {/* Kategorie s přepínačem a s konkrétním výčtem, co se ukládá. */}
              <div className="space-y-3">
                {m.groups.map((group) => {
                  const on = group.required || analyticsDraft;
                  return (
                    <section key={group.id} className="inset-block p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-display text-[1.02rem] font-semibold tracking-tight text-bone">
                          {group.title}
                        </h3>

                        {group.required ? (
                          <span className="chip">{m.alwaysOn}</span>
                        ) : (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            aria-label={m.choiceLabel}
                            onClick={() => setAnalyticsDraft((value) => !value)}
                            className="inline-flex items-center gap-2 text-[0.72rem] font-medium tracking-tight text-bone-dim"
                          >
                            <span
                              aria-hidden="true"
                              className={`relative h-5 w-9 rounded-full border transition-colors duration-200 ${
                                on ? 'border-transparent brand-fill' : 'border-line bg-inset'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-surface shadow transition-[left] duration-200 ${
                                  on ? 'left-[1.15rem]' : 'left-0.5'
                                }`}
                              />
                            </span>
                            {on ? m.enabled : m.disabled}
                          </button>
                        )}
                      </div>

                      <p className="mt-2.5 text-[0.8rem] leading-relaxed text-bone-dim">{group.text}</p>

                      {/* Na mobilu se tabulka roluje vodorovně, ať nerozbije šířku okna. */}
                      <div className="mt-3.5 -mx-1 overflow-x-auto px-1">
                        <table className="w-full min-w-[34rem] border-collapse text-left">
                          <thead>
                            <tr className="text-[0.62rem] uppercase tracking-[0.14em] text-bone-faint">
                              <th scope="col" className="pb-2 pr-3 font-medium">{m.tableHead.name}</th>
                              <th scope="col" className="pb-2 pr-3 font-medium">{m.tableHead.provider}</th>
                              <th scope="col" className="pb-2 pr-3 font-medium">{m.tableHead.purpose}</th>
                              <th scope="col" className="pb-2 font-medium">{m.tableHead.expiry}</th>
                            </tr>
                          </thead>
                          <tbody className="align-top">
                            {group.rows.map((row) => (
                              <tr key={row.name} className="border-t border-line/70">
                                <td className="py-2 pr-3 font-mono text-[0.72rem] text-bone">{row.name}</td>
                                <td className="py-2 pr-3 text-[0.72rem] text-bone-dim">{row.provider}</td>
                                <td className="py-2 pr-3 text-[0.72rem] text-bone-dim">{row.purpose}</td>
                                <td className="py-2 text-[0.72rem] text-bone-dim tnum">{row.expiry}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                })}
              </div>

              {/* Právní část: správce, základ zpracování, předávání, práva. */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {m.sections.map((section) => (
                  <section key={section.title}>
                    <h3 className="text-[0.82rem] font-semibold tracking-tight text-bone">{section.title}</h3>
                    <p className="mt-1.5 text-[0.76rem] leading-relaxed text-bone-dim">{section.text}</p>
                  </section>
                ))}
              </div>
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-line p-4 sm:p-5">
              <button
                type="button"
                onClick={() => decide(true)}
                className="btn-primary px-4 py-2 text-[0.8rem]"
              >
                {m.acceptAll}
              </button>
              <button
                type="button"
                onClick={() => decide(false)}
                className="btn-ghost px-4 py-2 text-[0.8rem]"
              >
                {m.rejectAll}
              </button>
              <button
                type="button"
                onClick={() => decide(analyticsDraft)}
                className="ml-auto text-[0.78rem] text-bone-dim underline-offset-2 transition-colors
                  hover:text-bone hover:underline"
              >
                {m.save}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
