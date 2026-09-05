export type Locale = 'cs' | 'en';

export const LOCALES: Locale[] = ['cs', 'en'];

export const DEFAULT_LOCALE: Locale = 'cs';

export function normalizeLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'cs';
}

/**
 * Výběr jazykové varianty jednoho textu.
 *
 * Texty kontrol schválně nebydlí ve vzdálené mapě klíčů, ale přímo u podmínky,
 * která je vybírá. Kontrol je přes třicet a většina má tři až čtyři varianty
 * podle naměřené hodnoty — se samostatným slovníkem by se prahy a texty časem
 * nevyhnutelně rozešly a nikdo by si toho nevšiml. Takhle je při úpravě prahu
 * překlad na očích.
 *
 * Pro souvislé bloky rozhraní (hero, FAQ, patička) to neplatí, ty mají běžný
 * slovník v `lib/i18n/ui.ts`.
 */
export type Translate = (cs: string, en: string) => string;

export function translator(locale: Locale): Translate {
  return locale === 'en' ? (_cs, en) => en : (cs) => cs;
}

/** Jazyk pro atribut `lang` a pro `toLocaleString`. */
export const HTML_LANG: Record<Locale, string> = { cs: 'cs', en: 'en' };
export const INTL_LOCALE: Record<Locale, string> = { cs: 'cs-CZ', en: 'en-GB' };
