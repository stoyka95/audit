import { createHash } from 'node:crypto';

/**
 * Dvě počítadla, která pohánějí čísla v patičce: kolik auditů doběhlo a kolik
 * různých lidí je spustilo.
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

const RUNS_KEY = 'audit:runs';
const PEOPLE_KEY = 'audit:people';

/** Hladiny, na které se počty zaokrouhlují směrem dolů. */
const STEPS = [10, 20, 30, 50, 100, 200, 500, 1000, 5000, 10000, 20000, 50000, 100000];

/** Náhrada úložiště pro běh bez Redisu. Přežije jen do uspání instance. */
const memory = { runs: 0, people: new Set<string>() };

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

/**
 * Jednosměrný otisk návštěvníka z IP adresy a hlavičky prohlížeče.
 *
 * Otisk nikam neputuje a nikde se neukládá — slouží jen jako vstup do
 * pravděpodobnostního počítadla níž, které si z něj nechá pár bitů a samotnou
 * hodnotu zahodí. Zpětně z něj tedy nejde zjistit ani IP adresa, ani nic jiného.
 * Sůl navíc rozbíjí možnost porovnávat otisky mezi provozy, když je nastavená.
 */
export function visitorFingerprint(ip: string | null, userAgent: string | null): string {
  const salt = process.env.VISITOR_SALT ?? 'audit.semakod.cz';
  return createHash('sha256').update(`${salt}|${ip ?? ''}|${userAgent ?? ''}`).digest('hex').slice(0, 32);
}

/** Zvýší počet doběhlých auditů. Selhání zápisu audit neshodí. */
export async function bumpAuditRuns(): Promise<void> {
  const config = kvConfig();
  if (!config) {
    memory.runs += 1;
    return;
  }
  await command(config, `incr/${RUNS_KEY}`);
}

/**
 * Přidá návštěvníka mezi započítané.
 *
 * Redis na to má HyperLogLog: místo seznamu otisků drží jen dvanáctikilobajtový
 * náčrt, ze kterého se dá odhadnout počet různých hodnot s chybou kolem procenta,
 * ale ne přečíst jediná z nich. Pro číslo, které se stejně zaokrouhluje na
 * „500+", je to přesnost víc než dostatečná — a nejde o databázi návštěvníků.
 */
export async function bumpVisitor(fingerprint: string): Promise<void> {
  const config = kvConfig();
  if (!config) {
    memory.people.add(fingerprint);
    return;
  }
  await command(config, `pfadd/${PEOPLE_KEY}/${encodeURIComponent(fingerprint)}`);
}

export async function readAuditRuns(): Promise<number> {
  const config = kvConfig();
  if (!config) return memory.runs;
  return (await command(config, `get/${RUNS_KEY}`)) ?? 0;
}

export async function readVisitors(): Promise<number> {
  const config = kvConfig();
  if (!config) return memory.people.size;
  return (await command(config, `pfcount/${PEOPLE_KEY}`)) ?? 0;
}

/**
 * Zaokrouhlení dolů na nejbližší hladinu. Pod deset se ukazuje přesné číslo —
 * „10+" u sedmi auditů by bylo tvrzení navíc.
 */
export function roundCount(total: number): string | null {
  if (!Number.isFinite(total) || total <= 0) return null;

  let step: number | null = null;
  for (const candidate of STEPS) {
    if (total >= candidate) step = candidate;
  }

  return step === null ? String(Math.floor(total)) : `${step}+`;
}
