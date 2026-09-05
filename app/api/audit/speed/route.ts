import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

import { runPageSpeed } from '@/lib/pagespeed';
import { normalizeUrl } from '@/lib/url';
import { buildCategory } from '@/lib/scoring';
import { speedChecks } from '@/lib/checks/speed';
import { emptyRobots } from '@/lib/robots';
import { LOCALES, translator, type Locale } from '@/lib/i18n';
import { logEvent } from '@/lib/log';
import type {
  AuditContext,
  CategoryResult,
  PageSpeedResult,
  PsiStrategy,
  TextResource,
} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Měření rychlosti pro jedno zařízení.
 *
 * Proč to není součástí hlavního auditu: Lighthouse na straně Googlu je zdaleka
 * nejpomalejší a nejnespolehlivější část celého procesu. Když běželo uvnitř
 * `/api/audit`, sdílelo šedesátisekundový strop funkce se stahováním HTML,
 * robots.txt a kontrolou odkazů — a při studené cache se do něj nevešlo.
 * Druhá strategie pak musela čekat, až první doběhne, takže se rozpočty
 * řadily za sebe a jedna z nich prakticky vždycky spadla.
 *
 * Teď si prohlížeč vyžádá mobil i počítač zvlášť a souběžně. Každý požadavek
 * je vlastní instance funkce s vlastním rozpočtem 60 s a při selhání se dá
 * zopakovat — Google mezitím měření dokončí a nacachuje, takže druhý pokus
 * bývá otázka pár sekund.
 */
const FIRST_TIMEOUT_MS = 55_000;

/**
 * Opakovaný pokus dostane kratší rozpočet. Když první pokus vypršel, Google
 * měření dopočítal a má ho v cache — odpověď pak chodí do půl minuty. Čekat
 * znovu celých 55 s by jen prodlužovalo neúspěch, aniž by to zvýšilo šanci.
 */
const RETRY_TIMEOUT_MS = 38_000;

function speedTitle(strategy: PsiStrategy, locale: Locale): { title: string; subtitle: string } {
  const t = translator(locale);
  return strategy === 'mobile'
    ? {
        title: t('Rychlost — mobil', 'Speed — mobile'),
        subtitle: t('Core Web Vitals na telefonu a odezva serveru', 'Core Web Vitals on a phone and server response'),
      }
    : {
        title: t('Rychlost — počítač', 'Speed — desktop'),
        subtitle: t('Core Web Vitals na desktopu', 'Core Web Vitals on desktop'),
      };
}

const EMPTY_RESOURCE: TextResource = { exists: false, status: null, text: '', finalUrl: null, failed: false };

/**
 * Rychlostní kontroly potřebují z kontextu jen PageSpeed a u mobilu navíc TTFB.
 * Ten změřil hlavní audit z vlastního požadavku, prohlížeč ho sem pošle s sebou.
 */
function speedOnlyContext(
  target: URL,
  psi: PageSpeedResult,
  ttfbMs: number | null,
  locale: Locale,
): AuditContext {
  return {
    targetUrl: target,
    locale,
    page: { ok: true, status: 200, finalUrl: target.toString(), html: '', headers: {}, ttfbMs },
    $: cheerio.load(''),
    robots: emptyRobots(),
    robotsFailed: false,
    llms: EMPTY_RESOURCE,
    sitemap: EMPTY_RESOURCE,
    sitemapFromRobots: null,
    jsonLd: [],
    psiMobile: psi,
    psiDesktop: psi,
    brokenLinks: { checked: 0, totalFound: 0, broken: [], failed: false },
    faviconLive: null,
  };
}

function readStrategy(value: unknown): PsiStrategy | null {
  return value === 'mobile' || value === 'desktop' ? value : null;
}

function readAttempt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 2 ? 2 : 1;
}

/** TTFB přichází z prohlížeče, takže se mu nedá věřit bez kontroly. */
function readTtfb(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > 120_000) return null;
  return Math.round(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const payload = body as {
    url?: unknown;
    strategy?: unknown;
    ttfbMs?: unknown;
    attempt?: unknown;
    locale?: unknown;
  };

  const normalized = normalizeUrl(payload?.url);
  if (!normalized.ok || !normalized.url) {
    return NextResponse.json({ error: normalized.error ?? 'Neplatná adresa.' }, { status: 400 });
  }

  const strategy = readStrategy(payload?.strategy);
  if (!strategy) {
    return NextResponse.json({ error: 'Neplatná strategie měření.' }, { status: 400 });
  }

  const target = normalized.url;
  const attempt = readAttempt(payload?.attempt);
  const timeoutMs = attempt === 1 ? FIRST_TIMEOUT_MS : RETRY_TIMEOUT_MS;
  const startedAt = Date.now();
  const psi = await runPageSpeed(target.toString(), strategy, timeoutMs);
  const ttfbMs = readTtfb(payload?.ttfbMs);

  logEvent('psi', {
    url: target.toString(),
    strategy,
    attempt,
    timeoutMs,
    durationMs: Date.now() - startedAt,
    available: psi.available,
    terminal: psi.terminal,
    usedKey: psi.usedKey,
    performanceScore: psi.performanceScore,
    fieldData: psi.fieldDataAvailable,
    error: psi.error,
  });

  // Kategorie se sestaví v obou jazycích, ať jde report přepnout bez nového měření.
  const byLocale = Object.fromEntries(
    LOCALES.map((code) => {
      const { title, subtitle } = speedTitle(strategy, code);
      const ctx = speedOnlyContext(target, psi, ttfbMs, code);
      return [
        code,
        buildCategory(
          strategy === 'mobile' ? 'speed-mobile' : 'speed-desktop',
          title,
          subtitle,
          speedChecks(ctx, strategy),
        ),
      ];
    }),
  ) as Record<Locale, CategoryResult>;

  return NextResponse.json(
    {
      strategy,
      byLocale,
      available: psi.available,
      error: psi.error,
      // false = má smysl poslat požadavek znovu (timeout, výpadek Lighthouse).
      terminal: psi.terminal,
      usedKey: psi.usedKey,
      fieldDataAvailable: psi.fieldDataAvailable,
      performanceScore: psi.performanceScore,
      lcpMs: psi.lcpMs,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export function GET() {
  return NextResponse.json(
    { error: 'Použijte metodu POST s tělem { "url": "https://…", "strategy": "mobile" }.' },
    { status: 405 },
  );
}
