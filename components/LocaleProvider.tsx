'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { HTML_LANG, INTL_LOCALE, normalizeLocale, type Locale } from '@/lib/i18n';
import { ui, type UiDict } from '@/lib/i18n/ui';

interface LocaleContextValue {
  locale: Locale;
  /** Slovník rozhraní pro aktuální jazyk. */
  t: UiDict;
  intl: string;
  setLocale: (next: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Jazyk drží React, ale prvotní hodnotu určuje skript v `<head>`, který ji
 * zapíše do `<html lang>` ještě před vykreslením. Server jazyk návštěvníka
 * nezná, takže start na `cs` a doplnění po připojení je jediná cesta, jak se
 * vyhnout rozdílu mezi serverovým a klientským HTML.
 */
export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('cs');

  useEffect(() => {
    setLocaleState(normalizeLocale(document.documentElement.getAttribute('lang')));
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.setAttribute('lang', HTML_LANG[next]);
    try {
      localStorage.setItem('locale', next);
    } catch {
      // Soukromý režim může úložiště zakázat; volba pak vydrží jen do zavření karty.
    }
    // Adresa se dá poslat dál i s jazykem, aniž by se stránka znovu načetla.
    const url = new URL(window.location.href);
    if (next === 'cs') url.searchParams.delete('lang');
    else url.searchParams.set('lang', next);
    window.history.replaceState({}, '', url);
  }, []);

  // Titulek a popis v <head> vykresluje server, který jazyk návštěvníka nezná.
  // Doplníme je po připojení — je to jediné místo, kde se překlad dostane
  // do metadat bez zdvojení celé stránky do /cs a /en.
  useEffect(() => {
    const dict = ui(locale);
    document.title = dict.metaTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', dict.metaDescription);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: ui(locale), intl: INTL_LOCALE[locale], setLocale }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale musí být uvnitř LocaleProvider.');
  return value;
}
