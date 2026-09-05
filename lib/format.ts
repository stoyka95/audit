import type { Locale } from './i18n';

/**
 * Formátování čísel pro report. Čeština píše desetinnou čárku a mezeru před
 * procentem, angličtina tečku a procento natěsno — jinak by anglická verze
 * působila jako strojový překlad.
 */
function decimalSeparator(locale: Locale): string {
  return locale === 'en' ? '.' : ',';
}

function withSeparator(value: string, locale: Locale): string {
  return locale === 'en' ? value : value.replace('.', ',');
}

export function formatSeconds(ms: number, locale: Locale = 'cs'): string {
  return `${withSeparator((ms / 1000).toFixed(1), locale)} s`;
}

export function formatMs(ms: number): string {
  return `${Math.round(ms)} ms`;
}

export function formatDecimal(value: number, digits = 3, locale: Locale = 'cs'): string {
  return withSeparator(value.toFixed(digits), locale);
}

export function formatPercent(value: number, locale: Locale = 'cs'): string {
  return locale === 'en' ? `${Math.round(value)}%` : `${Math.round(value)} %`;
}

export function formatBytes(bytes: number, locale: Locale = 'cs'): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${withSeparator((bytes / (1024 * 1024)).toFixed(1), locale)} MB`;
}

/** České skloňování podle počtu: 1 znak, 2–4 znaky, 5+ znaků. */
export function pluralCz(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  if (count >= 2 && count <= 4) return few;
  return many;
}

/** Anglický plurál — jediná forma navíc, ale ať se to nepíše všude ručně. */
export function pluralEn(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export { decimalSeparator };
