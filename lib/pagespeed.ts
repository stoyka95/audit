import { fetchWithTimeout, TimeoutError } from './http';
import type { PageSpeedResult, PsiStrategy } from './types';

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

const EMPTY: PageSpeedResult = {
  available: false,
  usedKey: false,
  error: null,
  performanceScore: null,
  lcpMs: null,
  clsValue: null,
  inpMs: null,
  inpSource: null,
  tbtMs: null,
  fcpMs: null,
  fieldDataAvailable: false,
};

function numeric(audit: unknown): number | null {
  if (!audit || typeof audit !== 'object') return null;
  const value = (audit as { numericValue?: unknown }).numericValue;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function percentile(metrics: unknown, key: string): number | null {
  if (!metrics || typeof metrics !== 'object') return null;
  const metric = (metrics as Record<string, unknown>)[key];
  if (!metric || typeof metric !== 'object') return null;
  const value = (metric as { percentile?: unknown }).percentile;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Interní výsledek jednoho pokusu.
 *
 * `retryable` = má smysl to zkusit hned znovu v rámci tohoto požadavku.
 * `terminal`  = nemá smysl to zkoušet vůbec, ani novým požadavkem z prohlížeče
 *               (překročený limit, adresa se analyzovat nedá).
 *
 * Rozdíl je podstatný u timeoutu: v rámci jednoho požadavku už není z čeho
 * opakovat, ale Google si rozdělané měření dokončí a nacachuje — druhý pokus
 * z prohlížeče proto obvykle dorazí během pár sekund.
 */
interface Attempt extends PageSpeedResult {
  retryable: boolean;
  terminal: boolean;
  /** true = pokus skončil vypršením limitu, tedy bez konkrétního důvodu. */
  timedOut: boolean;
}

/** Výsledek měření i s informací, zda má smysl poslat další požadavek. */
export interface PageSpeedRun extends PageSpeedResult {
  terminal: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Jeden pokus o volání PageSpeed Insights v5 (strategy=mobile). API klíč je
 * volitelný — bez klíče funguje anonymní volání s nižším rate limitem.
 */
async function attemptPageSpeed(url: string, strategy: PsiStrategy, timeoutMs: number): Promise<Attempt> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY?.trim();
  const usedKey = Boolean(apiKey);

  const params = new URLSearchParams({
    url,
    strategy,
    category: 'performance',
  });
  if (apiKey) params.set('key', apiKey);

  try {
    const response = await fetchWithTimeout(
      `${ENDPOINT}?${params.toString()}`,
      { method: 'GET', headers: { accept: 'application/json' } },
      timeoutMs,
    );

    if (!response.ok) {
      let message = `PageSpeed Insights vrátilo HTTP ${response.status}.`;
      // 5xx z Lighthouse bývá přechodné a selhává během zlomku sekundy —
      // opakovaný pokus obvykle projde. 429 a 400 opakovat nemá smysl.
      let retryable = response.status >= 500;
      let terminal = false;

      if (response.status === 429) {
        message = usedKey
          ? 'PageSpeed Insights odmítlo požadavek kvůli překročenému limitu (HTTP 429). Klíč má limit i na počet volání za minutu — počkejte chvíli a spusťte audit znovu.'
          : 'PageSpeed Insights odmítlo požadavek kvůli překročenému limitu (HTTP 429). Bez vlastního API klíče je limit anonymních volání nízký.';
        retryable = false;
        terminal = true;
      } else if (response.status === 400) {
        message = 'PageSpeed Insights nedokázalo stránku analyzovat (HTTP 400) — adresa může být pro měření nedostupná.';
        retryable = false;
        terminal = true;
      } else if (response.status >= 500) {
        message = `Měření na straně Googlu selhalo (HTTP ${response.status}). Lighthouse se na této stránce nepodařilo dokončit.`;
      }
      await response.arrayBuffer().catch(() => undefined);
      return { ...EMPTY, usedKey, error: message, retryable, terminal, timedOut: false };
    }

    const payload = (await response.json()) as Record<string, any>;
    const lighthouse = payload?.lighthouseResult ?? {};
    const audits = lighthouse?.audits ?? {};
    const score = lighthouse?.categories?.performance?.score;
    const fieldMetrics = payload?.loadingExperience?.metrics;

    const inpMs =
      percentile(fieldMetrics, 'INTERACTION_TO_NEXT_PAINT') ??
      percentile(fieldMetrics, 'EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT');

    return {
      available: true,
      usedKey,
      error: null,
      performanceScore: typeof score === 'number' ? Math.round(score * 100) : null,
      lcpMs: numeric(audits['largest-contentful-paint']),
      clsValue: numeric(audits['cumulative-layout-shift']),
      inpMs,
      inpSource: inpMs === null ? null : 'field',
      tbtMs: numeric(audits['total-blocking-time']),
      fcpMs: numeric(audits['first-contentful-paint']),
      fieldDataAvailable: Boolean(fieldMetrics),
      retryable: false,
      terminal: false,
      timedOut: false,
    };
  } catch (err) {
    if (err instanceof TimeoutError) {
      // V rámci tohoto požadavku už není z čeho opakovat, ale Google měření
      // dokončí na svojí straně a nacachuje ho — další požadavek proto dává smysl.
      return {
        ...EMPTY,
        usedKey,
        retryable: false,
        terminal: false,
        timedOut: true,
        error:
          'PageSpeed Insights nestihlo stránku změřit v časovém limitu. ' +
          'U rozsáhlých stránek to není výjimečné.',
      };
    }
    return {
      ...EMPTY,
      usedKey,
      retryable: true,
      terminal: false,
      timedOut: false,
      error: err instanceof Error ? err.message : 'Volání PageSpeed Insights selhalo.',
    };
  }
}

/** Kolik času musí zbýt, aby mělo smysl pouštět další pokus. */
const MIN_RETRY_BUDGET_MS = 8_000;

/**
 * Volá PageSpeed Insights a při přechodné chybě (5xx nebo výpadek spojení)
 * pokus jednou zopakuje — ale jen pokud v rámci celkového rozpočtu zbývá
 * dost času. Přechodné 5xx přichází typicky do jedné sekundy, takže druhý
 * pokus pak dostane prakticky celý rozpočet.
 */
export async function runPageSpeed(
  url: string,
  strategy: PsiStrategy = 'mobile',
  timeoutMs = 54_000,
): Promise<PageSpeedRun> {
  const deadline = Date.now() + timeoutMs;
  const maxAttempts = 2;
  let last: Attempt | null = null;
  /** První pokus, který skončil konkrétním důvodem místo vypršení limitu. */
  let explained: Attempt | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_RETRY_BUDGET_MS) break;

    const result = await attemptPageSpeed(url, strategy, remaining);
    const { retryable, timedOut, ...publicResult } = result;

    if (result.available) return publicResult;
    last = result;
    if (!timedOut && !explained) explained = result;
    if (!retryable || attempt === maxAttempts) break;

    // Krátká pauza, ať se přechodná chyba na straně Googlu stihne uklidnit.
    if (deadline - Date.now() < MIN_RETRY_BUDGET_MS + 1200) break;
    await sleep(1200);
  }

  if (last) {
    const { retryable, timedOut, ...publicResult } = last;
    // „Nestihlo se to v limitu" je nejméně užitečná zpráva, jakou můžeme dát.
    // Když dřívější pokus vrátil konkrétní důvod (typicky HTTP 500, tedy pád
    // Lighthouse na téhle stránce), uvedeme radši ten — vede k jiné reakci
    // než čekání na rychlejší server.
    if (timedOut && explained?.error) {
      return {
        ...publicResult,
        error: `${explained.error} Opakovaný pokus pak vypršel v časovém limitu.`,
      };
    }
    return publicResult;
  }
  return {
    ...emptyPageSpeed('Na měření rychlosti nezbyl čas v rámci limitu funkce.'),
    terminal: false,
  };
}

export function emptyPageSpeed(error: string): PageSpeedResult {
  return { ...EMPTY, error };
}

/**
 * Zástupný výsledek pro měření, které si prohlížeč teprve vyžádá zvlášť.
 * Kontroly z něj vyjdou jako `unknown`, takže kategorie zůstane nehodnocená,
 * dokud nedorazí skutečná data.
 */
export function pendingPageSpeed(): PageSpeedResult {
  return { ...EMPTY, pending: true, error: null };
}
