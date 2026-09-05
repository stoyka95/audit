import { translator, type Locale } from './i18n';
import type { BlockerRow, CategoryId, CategoryResult, CheckResult, CheckStatus } from './types';

const STATUS_VALUE: Record<Exclude<CheckStatus, 'unknown'>, number> = {
  pass: 1,
  warn: 0.5,
  fail: 0,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export interface RampAnchors {
  /** Hodnota, od které je metrika bez výhrad (skóre 1). */
  good: number;
  /** Hranice mezi „ke zlepšení" a „špatné" (skóre 0,5). */
  poor: number;
  /** Hodnota, od které už je skóre 0. */
  zero: number;
}

/**
 * Po částech lineární převod naměřené hodnoty na skóre 0–1, kde menší = lepší.
 * Nahrazuje plošné `warn = 0,5`: bez toho by LCP 2,6 s a 3,9 s dopadly stejně
 * a uživatel by po optimalizaci neviděl ve skóre žádný pohyb.
 *
 * good → 1, poor → 0,5, zero → 0, mezi tím lineárně.
 */
export function ramp(value: number, { good, poor, zero }: RampAnchors): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= good) return 1;
  if (value >= zero) return 0;
  if (value < poor) {
    const span = poor - good;
    return span <= 0 ? 0.5 : 1 - 0.5 * ((value - good) / span);
  }
  const span = zero - poor;
  return span <= 0 ? 0 : 0.5 - 0.5 * ((value - poor) / span);
}

/**
 * Kolik váhy kategorie musí být skutečně ověřené, aby mělo smysl skóre ukazovat.
 * Dřív tu byla ostrá hrana „neověřeného je víc než ověřeného" (tedy 0,5), u které
 * 6:6 ještě prošlo a 6,1:5,9 už ne. Poměr je čitelnější a přísnější.
 */
export const MIN_KNOWN_RATIO = 0.6;

export interface CategoryScore {
  /** Zaokrouhlené skóre pro zobrazení. */
  score: number;
  /** Nezaokrouhlené skóre. Celkový průměr počítá z něj, aby se nezaokrouhlovalo dvakrát. */
  scoreRaw: number;
  scored: boolean;
  /** Podíl ověřené váhy, 0–1. Kontroly s nulovou váhou se nepočítají. */
  confidence: number;
}

/**
 * Vážené skóre kategorie; kontroly se stavem `unknown` se do výpočtu nepočítají.
 * Když je ověřená míň než {@link MIN_KNOWN_RATIO} váhy, skóre by stálo na příliš
 * malém vzorku — kategorie se pak označí jako nehodnocená místo toho, aby hlásila
 * zavádějící číslo.
 */
export function scoreChecks(checks: CheckResult[]): CategoryScore {
  let weighted = 0;
  let knownWeight = 0;
  let unknownWeight = 0;

  for (const check of checks) {
    // Váha 0 = informativní řádek. Nesmí ovlivnit skóre ani poměr
    // ověřeno/neověřeno, jinak by nedostupné PSI shodilo celou kategorii.
    if (check.weight === 0) continue;

    if (check.status === 'unknown') {
      unknownWeight += check.weight;
      continue;
    }
    const value = check.score === undefined ? STATUS_VALUE[check.status] : clamp01(check.score);
    weighted += value * check.weight;
    knownWeight += check.weight;
  }

  const totalWeight = knownWeight + unknownWeight;
  const confidence = totalWeight === 0 ? 0 : knownWeight / totalWeight;

  if (knownWeight === 0 || confidence < MIN_KNOWN_RATIO) {
    return { score: 0, scoreRaw: 0, scored: false, confidence };
  }
  const raw = (weighted / knownWeight) * 100;
  return { score: Math.round(raw), scoreRaw: raw, scored: true, confidence };
}

export function buildCategory(
  id: CategoryId,
  title: string,
  subtitle: string,
  checks: CheckResult[],
): CategoryResult {
  return { id, title, subtitle, ...scoreChecks(checks), checks };
}

/**
 * Podíl ověřené váhy napříč celým auditem. Bez toho by report vypadal stejně
 * jistě, ať už se povedlo ověřit všechno, nebo jen polovinu kontrol.
 */
export function auditConfidence(categories: CategoryResult[]): number {
  let known = 0;
  let total = 0;
  for (const category of categories) {
    for (const check of category.checks) {
      if (check.weight === 0) continue;
      total += check.weight;
      if (check.status !== 'unknown') known += check.weight;
    }
  }
  return total === 0 ? 0 : known / total;
}

/**
 * Váhy kategorií v celkovém skóre. Bez nich by prostý průměr rozbil váhy uvnitř
 * kategorií: AEO má součet vah 4 a SEO 23, takže jedna jednotka váhy v AEO by
 * stála pětinásobek toho, co jednotka v SEO — nice-to-have kontrola by trestala
 * víc než chybějící title.
 */
export const CATEGORY_WEIGHT: Record<CategoryId, number> = {
  seo: 25,
  // Rychlost dohromady 25 jako dřív, jen rozdělená. Mobil váží víc, protože
  // Google indexuje mobile-first a většina návštěv chodí z telefonu.
  'speed-mobile': 15,
  'speed-desktop': 10,
  aeo: 12,
  geo: 13,
  tech: 13,
  a11y: 12,
};

/** Vážený průměr přes hodnocené kategorie; nehodnocené se renormalizují pryč. */
export function overallScore(categories: CategoryResult[]): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const category of categories) {
    if (!category.scored) continue;
    const weight = CATEGORY_WEIGHT[category.id];
    // Vědomě nezaokrouhlená hodnota: zaokrouhlit skóre kategorií a pak i jejich
    // průměr znamená chybu až o bod navíc.
    weighted += category.scoreRaw * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weighted / totalWeight);
}

/**
 * Strop celkového skóre při fatálním nálezu. Web s `Disallow: /` nebo `noindex`
 * se do vyhledávání nedostane vůbec — bez stropu by mu prostý průměr kategorií
 * dal i 89 bodů, protože ostatní kontroly jsou v pořádku.
 */
export const BLOCKER_SCORE_CAP = 35;

/** Vybere fatální nálezy: kontroly označené `blocker`, které skutečně selhaly. */
export function collectBlockers(categories: CategoryResult[]): BlockerRow[] {
  const blockers: BlockerRow[] = [];
  for (const category of categories) {
    for (const check of category.checks) {
      if (check.blocker && check.status === 'fail') {
        blockers.push({ id: check.id, label: check.label, reason: check.blocker });
      }
    }
  }
  return blockers;
}

export function applyBlockerCap(score: number, blockers: BlockerRow[]): number {
  return blockers.length > 0 ? Math.min(score, BLOCKER_SCORE_CAP) : score;
}

export type ScoreBand = 'great' | 'good' | 'average' | 'poor';

export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return 'great';
  if (score >= 75) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}

export const BAND_LABEL: Record<Locale, Record<ScoreBand, string>> = {
  cs: { great: 'Skvělé', good: 'Dobré', average: 'Průměrné', poor: 'Slabé' },
  en: { great: 'Excellent', good: 'Good', average: 'Average', poor: 'Weak' },
};

/**
 * Poznámka o nehodnocených kategoriích. Vzniká až v prohlížeči — server ji
 * složit nemůže, protože v době jeho odpovědi obě rychlostní kategorie na
 * měření teprve čekají a vypadaly by jako selhané.
 */
export function unscoredNote(categories: CategoryResult[], locale: Locale = 'cs'): string | null {
  const unscored = categories.filter((category) => !category.scored);
  if (unscored.length === 0) return null;
  const t = translator(locale);
  const names = unscored.map((category) => category.title).join(', ');
  const scored = categories.length - unscored.length;
  return t(
    `Nehodnoceno: ${names} — nepodařilo se ověřit dost kontrol. Celkové skóre proto vychází z ${scored} ` +
      `z ${categories.length} kategorií a s plným auditem ho neporovnávejte.`,
    `Not scored: ${names} — too few checks could be verified. The overall score therefore comes from ` +
      `${scored} of ${categories.length} categories; do not compare it with a full audit.`,
  );
}
