/** Normalizace a bezpečnostní kontrola vstupní URL. */

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /\.local$/i,
  /\.internal$/i,
];

export interface NormalizeResult {
  ok: boolean;
  url?: URL;
  error?: string;
}

export function normalizeUrl(raw: unknown): NormalizeResult {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Chybí adresa webu.' };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Chybí adresa webu.' };
  }
  if (trimmed.length > 2048) {
    return { ok: false, error: 'Adresa je příliš dlouhá.' };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return { ok: false, error: 'Zadejte platnou URL adresu, například https://www.priklad.cz.' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'Podporované jsou pouze adresy http:// a https://.' };
  }

  const host = url.hostname;
  if (!host || !host.includes('.')) {
    return { ok: false, error: 'Adresa neobsahuje platnou doménu.' };
  }
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return { ok: false, error: 'Lze auditovat pouze veřejně dostupné adresy.' };
  }

  url.hash = '';
  return { ok: true, url };
}

/** Absolutní URL vůči základu; vrací null u neplatných nebo nehttp schémat. */
export function resolveUrl(href: string, base: string): URL | null {
  try {
    const resolved = new URL(href, base);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    return resolved;
  } catch {
    return null;
  }
}

export function sameRegistrableHost(a: string, b: string): boolean {
  const strip = (host: string) => host.replace(/^www\./i, '').toLowerCase();
  return strip(a) === strip(b);
}
