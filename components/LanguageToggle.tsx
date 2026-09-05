'use client';

import { LOCALES, type Locale } from '@/lib/i18n';
import { useLocale } from './LocaleProvider';

/**
 * Přepínač jazyka. Dvě pilulky vedle sebe místo rozbalovacího seznamu —
 * jazyky jsou jen dva, takže výběr na jedno kliknutí je rychlejší a je z něj
 * na první pohled vidět, co je zapnuté.
 */
export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, t, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label={t.language.aria}
      className={`flex shrink-0 items-center rounded-full border border-line bg-surface/70 p-0.5 ${className}`}
    >
      {LOCALES.map((code: Locale) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            title={active ? undefined : t.language.switchTo}
            className={`rounded-full px-2.5 py-1.5 text-[0.7rem] font-semibold tracking-[0.06em] transition-colors
              duration-200 ${active ? 'brand-fill text-white' : 'text-bone-faint hover:text-bone'}`}
          >
            {t.language.short[code]}
          </button>
        );
      })}
    </div>
  );
}
