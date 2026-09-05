import type { FetchedPage, TextResource } from './types';

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36 WebAuditTool/1.0';

const BASE_HEADERS: Record<string, string> = {
  'user-agent': USER_AGENT,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'cs-CZ,cs;q=0.9,en;q=0.8',
};

/** Maximální velikost staženého HTML (2 MB) — pojistka proti obřím stránkám. */
const MAX_HTML_BYTES = 2 * 1024 * 1024;

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Vypršel časový limit ${ms} ms.`);
    this.name = 'TimeoutError';
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
      headers: { ...BASE_HEADERS, ...(init.headers as Record<string, string> | undefined) },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new TimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

/** Stáhne cílovou stránku a změří TTFB (čas do doručení hlaviček odpovědi). */
export async function fetchPage(url: string, timeoutMs = 8000): Promise<FetchedPage> {
  const started = Date.now();
  try {
    const response = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);
    const ttfbMs = Date.now() - started;
    const buffer = await response.arrayBuffer();
    const sliced = buffer.byteLength > MAX_HTML_BYTES ? buffer.slice(0, MAX_HTML_BYTES) : buffer;
    const html = new TextDecoder('utf-8', { fatal: false }).decode(sliced);

    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url || url,
      html,
      headers: headersToObject(response.headers),
      ttfbMs,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      html: '',
      headers: {},
      ttfbMs: null,
      error: err instanceof Error ? err.message : 'Neznámá chyba při stahování.',
    };
  }
}

/** Stáhne textový doprovodný soubor (robots.txt, llms.txt, sitemap.xml). */
export async function fetchText(url: string, timeoutMs = 6000, maxChars = 200_000): Promise<TextResource> {
  try {
    const response = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);
    if (!response.ok) {
      // Tělo je potřeba odbavit, aby se spojení uvolnilo.
      await response.arrayBuffer().catch(() => undefined);
      return { exists: false, status: response.status, text: '', finalUrl: response.url || url, failed: false };
    }
    const text = (await response.text()).slice(0, maxChars);
    return { exists: true, status: response.status, text, finalUrl: response.url || url, failed: false };
  } catch {
    return { exists: false, status: null, text: '', finalUrl: null, failed: true };
  }
}

export interface LinkProbe {
  status: number | null;
  failed: boolean;
  reason?: string;
}

/** HEAD s fallbackem na GET (řada serverů HEAD neumí a vrací 403/405). */
export async function probeLink(url: string, timeoutMs = 5000): Promise<LinkProbe> {
  try {
    const head = await fetchWithTimeout(url, { method: 'HEAD' }, timeoutMs);
    if (head.status === 405 || head.status === 403 || head.status === 501) {
      try {
        const get = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);
        await get.arrayBuffer().catch(() => undefined);
        return { status: get.status, failed: false };
      } catch {
        return { status: head.status, failed: false };
      }
    }
    return { status: head.status, failed: false };
  } catch (err) {
    return {
      status: null,
      failed: true,
      reason: err instanceof Error ? err.message : 'Nepodařilo se navázat spojení.',
    };
  }
}
