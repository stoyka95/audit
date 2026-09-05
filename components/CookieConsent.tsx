'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from './LocaleProvider';
import GoogleTagManager from './GoogleTagManager';

type Consent = 'unset' | 'accepted' | 'rejected';

const STORAGE_KEY = 'cookie-consent';
/** Patička posílá tuhle událost, aby šla lišta znovu otevřít i po volbě —
 * s CookieConsent nesdílí žádný kontext, jen totéž okno. */
const REOPEN_EVENT = 'cookie-consent:open';

function readConsent(): Consent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'accepted' || raw === 'rejected' ? raw : 'unset';
  } catch {
    return 'unset';
  }
}

/**
 * Souhlas je defaultně "unset" — dokud návštěvník nerozhodne, Tag Manager
 * se vůbec nenačte (opt-in, ne opt-out se sledováním předem).
 */
export default function CookieConsent() {
  const { t } = useLocale();
  const [consent, setConsent] = useState<Consent>('unset');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    setVisible(stored === 'unset');

    const reopen = () => setVisible(true);
    window.addEventListener(REOPEN_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_EVENT, reopen);
  }, []);

  const decide = useCallback((next: Exclude<Consent, 'unset'>) => {
    setConsent(next);
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Soukromý režim může úložiště zakázat; volba pak platí jen pro tuto návštěvu.
    }
  }, []);

  return (
    <>
      {consent === 'accepted' ? <GoogleTagManager /> : null}

      {visible ? (
        <div className="fixed inset-x-3 bottom-3 z-[60] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-sm">
          <div className="panel panel-strong animate-fade-up p-4 sm:p-5">
            <p className="text-[0.8rem] leading-relaxed text-bone-dim">{t.cookie.text}</p>
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => decide('accepted')}
                className="btn-primary px-4 py-2 text-[0.8rem]"
              >
                {t.cookie.accept}
              </button>
              <button
                type="button"
                onClick={() => decide('rejected')}
                className="btn-ghost px-4 py-2 text-[0.8rem]"
              >
                {t.cookie.reject}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
