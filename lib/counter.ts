/**
 * Počítadlo skutečně spuštěných auditů.
 *
 * V patičce se ukazuje jen zaokrouhlená hodnota, ale zaokrouhluje se reálné
 * číslo — nic se tu nevymýšlí ani nenafukuje. Když počítadlo nemá kam zapisovat,
 * patička radši nepíše nic, než aby psala odhad.
 *
 * Úložiště je Redis přes REST (Vercel KV i Upstash mluví stejným protokolem),
 * protože běh na serverless funkci nemá žádnou vlastní paměť mezi požadavky.
 * Bez nastavených proměnných se počítá jen v paměti instance — to je pro vývoj
 * dost a v produkci se to pozná: `persistent: false`.
 */

const KEY = 'audit:runs';

/** Hladiny, na které se počet zaokrouhluje směrem dolů. */
const STEPS = [10, 20, 30, 50, 100, 200, 500, 1000, 5000, 10000, 20000, 50000, 100000];

/** Počítadlo pro běh bez úložiště. Přežije jen do uspání instance. */
let memory = 0;

interface KvConfig {
  url: string;
  token: string;
}

/**
 * Vercel KV a Upstash se liší jen názvy proměnných; obsluha je stejná, takže
 * bere obojí a integrace se dá vyměnit bez zásahu do kódu.
 */
function kvConfig(): KvConfig | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

export function counterIsPersistent(): boolean {
  return kvConfig() !== null;
}

/** Jeden příkaz Redisu přes REST. Timeout je krátký — audit na počítadlo nečeká. */
async function command(config: KvConfig, path: string): Promise<number | null> {
  const abort = AbortSignal.timeout(2500);
  try {
    const response = await fetch(`${config.url}/${path}`, {
      headers: { authorization: `Bearer ${config.token}` },
      cache: 'no-store',
      signal: abort,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: unknown };
    const value = typeof payload.result === 'string' ? Number(payload.result) : payload.result;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Zvýší počítadlo o jedna a vrátí nový stav. Selhání zápisu audit neshodí. */
export async function bumpAuditRuns(): Promise<number> {
  const config = kvConfig();
  if (!config) {
    memory += 1;
    return memory;
  }
  const value = await command(config, `incr/${KEY}`);
  return value ?? 0;
}

export async function readAuditRuns(): Promise<number> {
  const config = kvConfig();
  if (!config) return memory;
  const value = await command(config, `get/${KEY}`);
  return value ?? 0;
}

/**
 * Zaokrouhlení dolů na nejbližší hladinu. Pod deset auditů se ukazuje přesné
 * číslo — „10+" u sedmi běhů by bylo tvrzení navíc.
 */
export function roundRuns(total: number): string | null {
  if (!Number.isFinite(total) || total <= 0) return null;

  let step: number | null = null;
  for (const candidate of STEPS) {
    if (total >= candidate) step = candidate;
  }

  return step === null ? String(Math.floor(total)) : `${step}+`;
}
