import type { CheerioAPI } from 'cheerio';
import type { JsonLdEntry } from './types';

function collectTypes(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

function flatten(node: unknown, out: JsonLdEntry[], depth = 0): void {
  if (depth > 6 || node === null || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) flatten(item, out, depth + 1);
    return;
  }

  const record = node as Record<string, unknown>;
  out.push({ data: record, types: collectTypes(record['@type']) });

  if ('@graph' in record) flatten(record['@graph'], out, depth + 1);

  // Zanořené entity typu mainEntity / itemListElement mohou nést FAQ položky.
  for (const key of ['mainEntity', 'itemListElement', 'hasPart', 'about']) {
    if (key in record) flatten(record[key], out, depth + 1);
  }
}

/** Vytáhne všechny JSON-LD bloky; nevalidní JSON se tiše přeskočí. */
export function extractJsonLd($: CheerioAPI): { entries: JsonLdEntry[]; blocks: number; invalid: number } {
  const entries: JsonLdEntry[] = [];
  let blocks = 0;
  let invalid = 0;

  $('script[type="application/ld+json"]').each((_, element) => {
    blocks += 1;
    const raw = $(element).contents().text().trim();
    if (!raw) {
      invalid += 1;
      return;
    }
    try {
      flatten(JSON.parse(raw), entries);
    } catch {
      invalid += 1;
    }
  });

  return { entries, blocks, invalid };
}

export function hasType(entries: JsonLdEntry[], ...wanted: string[]): boolean {
  const needles = wanted.map((item) => item.toLowerCase());
  return entries.some((entry) =>
    entry.types.some((type) => needles.includes(type.replace(/^https?:\/\/schema\.org\//i, '').toLowerCase())),
  );
}

export function allTypes(entries: JsonLdEntry[]): string[] {
  const set = new Set<string>();
  for (const entry of entries) {
    for (const type of entry.types) {
      set.add(type.replace(/^https?:\/\/schema\.org\//i, ''));
    }
  }
  return [...set];
}

/**
 * Rozbalí hodnotu vlastnosti na řetězec. JSON-LD dovoluje zapsat tutéž hodnotu
 * jako `"2026-01-01"`, `["2026-01-01"]` i `{"@value": "2026-01-01"}` — bez
 * rozbalení by poslední dvě varianty vypadaly jako chybějící údaj.
 */
function unwrapValue(value: unknown, depth = 0): string | null {
  if (depth > 3) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const unwrapped = unwrapValue(item, depth + 1);
      if (unwrapped) return unwrapped;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    return unwrapValue((value as Record<string, unknown>)['@value'], depth + 1);
  }
  return null;
}

/** První nalezená hodnota daného klíče napříč JSON-LD entitami. */
export function findValue(entries: JsonLdEntry[], key: string): string | null {
  for (const entry of entries) {
    if (!(key in entry.data)) continue;
    const value = unwrapValue(entry.data[key]);
    if (value) return value;
  }
  return null;
}
