import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

import { fetchPage, fetchText, probeLink } from '@/lib/http';
import { emptyRobots, parseRobots } from '@/lib/robots';
import { extractJsonLd } from '@/lib/jsonld';
import { pendingPageSpeed } from '@/lib/pagespeed';
import { normalizeUrl, resolveUrl, sameRegistrableHost } from '@/lib/url';
import { logEvent } from '@/lib/log';
import { LOCALES, normalizeLocale, translator, type Locale } from '@/lib/i18n';
import {
  applyBlockerCap,
  auditConfidence,
  buildCategory,
  collectBlockers,
  overallScore,
} from '@/lib/scoring';
import { speedChecks } from '@/lib/checks/speed';
import { seoChecks } from '@/lib/checks/seo';
import { aeoChecks } from '@/lib/checks/aeo';
import { geoChecks } from '@/lib/checks/geo';
import { techChecks } from '@/lib/checks/tech';
import type {
  AuditContext,
  AuditPayload,
  BlockerRow,
  BrokenLinkRow,
  BrokenLinkScan,
  LocalizedAudit,
  TextResource,
} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Stahování cizích zdrojů se občas zadrhne; výchozích 10 s by nestačilo.
export const maxDuration = 60;

const MAX_LINKS_TO_CHECK = 15;

const FAILED_RESOURCE: TextResource = {
  exists: false,
  status: null,
  text: '',
  finalUrl: null,
  failed: true,
};

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

/** Sesbírá interní odkazy z HTML a ověří max. 15 z nich metodou HEAD. */
async function scanInternalLinks(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  host: string,
): Promise<BrokenLinkScan> {
  const candidates = new Set<string>();

  $('a[href]').each((_, element) => {
    const href = ($(element).attr('href') ?? '').trim();
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;

    const resolved = resolveUrl(href, baseUrl);
    if (!resolved) return;
    if (!sameRegistrableHost(resolved.hostname, host)) return;

    resolved.hash = '';
    if (resolved.toString() !== baseUrl) candidates.add(resolved.toString());
  });

  const totalFound = candidates.size;
  const toCheck = [...candidates].slice(0, MAX_LINKS_TO_CHECK);

  if (toCheck.length === 0) {
    return { checked: 0, totalFound, broken: [], failed: false };
  }

  const results = await Promise.allSettled(toCheck.map((url) => probeLink(url)));

  const broken: BrokenLinkRow[] = [];
  let networkFailures = 0;

  results.forEach((result, index) => {
    const url = toCheck[index];
    if (result.status !== 'fulfilled') {
      networkFailures += 1;
      return;
    }
    const probe = result.value;
    if (probe.failed) {
      networkFailures += 1;
      broken.push({ url, status: null, note: probe.reason ?? 'Nepodařilo se navázat spojení.' });
      return;
    }
    if (probe.status !== null && probe.status >= 400) {
      broken.push({ url, status: probe.status, note: `HTTP ${probe.status}` });
    }
  });

  return {
    checked: toCheck.length,
    totalFound,
    broken,
    failed: networkFailures === toCheck.length,
  };
}

/** Heuristika: prázdný root div a skoro žádný text = obsah nejspíš rendruje JavaScript. */
function detectSpa($: cheerio.CheerioAPI, html: string): boolean {
  // Bez odstranění skriptů by inline JS (typicky __NEXT_DATA__) vypadal jako text
  // a prázdná SPA by se tvářila jako plnohodnotná stránka.
  const body = $('body').clone();
  body.find('script, style, noscript, template').remove();
  const bodyText = body.text().replace(/\s+/g, ' ').trim();
  const hasAppRoot = $('#root, #app, #__next, [data-reactroot]').length > 0;
  return bodyText.length < 600 && (hasAppRoot || /<div[^>]+id="(root|app)"/i.test(html));
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const normalized = normalizeUrl((body as { url?: unknown })?.url);
  const locale = normalizeLocale((body as { locale?: unknown })?.locale);
  const t = translator(locale);
  if (!normalized.ok || !normalized.url) {
    return NextResponse.json({ error: normalized.error ?? 'Neplatná adresa.' }, { status: 400 });
  }

  const targetUrl = normalized.url;
  const target = targetUrl.toString();
  const origin = targetUrl.origin;

  const faviconPromise = probeLink(`${origin}/favicon.ico`, 4000).catch(() => null);

  // Stažení HTML musí uspět; ostatní zdroje jsou nepovinné.
  const page = await fetchPage(target);
  if (!page.html || page.status === 0) {
    logEvent('audit-error', { url: target, status: page.status, error: page.error ?? null });
    return NextResponse.json(
      {
        error: t('Stránku se nepodařilo načíst.', 'The page could not be loaded.'),
        detail:
          page.error ??
          t(`Server odpověděl kódem ${page.status}.`, `The server responded with status ${page.status}.`),
      },
      { status: 502 },
    );
  }

  const $ = cheerio.load(page.html);
  const baseUrl = page.finalUrl || target;

  const [robotsSettled, llmsSettled, sitemapSettled, linksSettled] = await Promise.allSettled([
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/llms.txt`),
    fetchText(`${origin}/sitemap.xml`),
    scanInternalLinks($, baseUrl, targetUrl.hostname),
  ]);

  const robotsResource = settled(robotsSettled, FAILED_RESOURCE);
  const llms = settled(llmsSettled, FAILED_RESOURCE);
  const sitemap = settled(sitemapSettled, FAILED_RESOURCE);
  const brokenLinks = settled(linksSettled, {
    checked: 0,
    totalFound: 0,
    broken: [],
    failed: true,
  } satisfies BrokenLinkScan);

  // robots.txt vrácený jako HTML fallback (běžné u SPA hostingů) není platný robots.txt.
  const robotsIsHtml = robotsResource.exists && /^\s*<(!doctype|html)/i.test(robotsResource.text);
  const robots =
    robotsResource.exists && !robotsIsHtml ? parseRobots(robotsResource.text) : emptyRobots();
  const robotsFailed = robotsResource.failed;

  const sitemapFromRobots = robots.sitemaps.length > 0 ? robots.sitemaps[0] : null;

  // Výsledek /favicon.ico se použije jen tehdy, když favicon není deklarovaný v HTML.
  const hasFaviconTag =
    $('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').length > 0;
  const faviconProbe = await faviconPromise;
  const faviconLive = hasFaviconTag
    ? null
    : faviconProbe === null || faviconProbe.failed
      ? null
      : faviconProbe.status !== null && faviconProbe.status < 400;

  // Rychlost se tu neměří vůbec. Lighthouse je nejpomalejší a nejkřehčí část
  // celého auditu a když sdílel rozpočet funkce se zbytkem, shazoval ho s sebou.
  // Prohlížeč si o mobil i počítač řekne zvlášť na /api/audit/speed — každý
  // dostane vlastní rozpočet a dá se samostatně zopakovat.
  const psiMobile = pendingPageSpeed();
  const psiDesktop = pendingPageSpeed();

  const { entries: jsonLd } = extractJsonLd($);

  /**
   * Sestaví jazykově závislou část reportu. Volá se pro každý jazyk zvlášť;
   * kontroly jsou čisté funkce nad stejným DOMem, takže druhý průchod nic
   * neměří znovu a stojí zlomek milisekundy.
   */
  function buildFor(locale: Locale): LocalizedAudit {
    const t = translator(locale);
    const ctx: AuditContext = {
      targetUrl,
      locale,
      page,
      $,
      robots,
      robotsFailed,
      llms,
      sitemap,
      sitemapFromRobots,
      jsonLd,
      psiMobile,
      psiDesktop,
      brokenLinks,
      faviconLive,
    };

    const categories = [
      buildCategory(
        'speed-mobile',
        t('Rychlost — mobil', 'Speed — mobile'),
        t('Core Web Vitals na telefonu a odezva serveru', 'Core Web Vitals on a phone and server response'),
        speedChecks(ctx, 'mobile'),
      ),
      buildCategory(
        'speed-desktop',
        t('Rychlost — počítač', 'Speed — desktop'),
        t('Core Web Vitals na desktopu', 'Core Web Vitals on desktop'),
        speedChecks(ctx, 'desktop'),
      ),
      buildCategory('seo', 'SEO', t('Základní on-page a indexovatelnost', 'On-page basics and indexability'), seoChecks(ctx)),
      buildCategory('aeo', 'AEO', t('Připravenost na odpovědi ve vyhledávání', 'Readiness for answer engines'), aeoChecks(ctx)),
      buildCategory('geo', 'GEO', t('Viditelnost pro generativní AI', 'Visibility for generative AI'), geoChecks(ctx)),
      buildCategory('tech', t('Správnost', 'Soundness'), t('Technický stav a spolehlivost', 'Technical health and reliability'), techChecks(ctx)),
    ];

    // Fatální nálezy: sesbírané z kontrol plus stav odpovědi, který kontrolou není.
    const blockers: BlockerRow[] = collectBlockers(categories);
    if (page.status >= 400) {
      blockers.push({
        id: 'http-status',
        label: t(`Chybová odpověď HTTP ${page.status}`, `HTTP ${page.status} error response`),
        reason: t(
          `Adresa vrátila kód ${page.status}, takže tato stránka pro návštěvníky ani roboty neexistuje.`,
          `The address returned status ${page.status}, so this page does not exist for visitors or crawlers.`,
        ),
      });
    }

    // Poznámky k rychlosti sem nepatří — v tuhle chvíli měření ještě neproběhlo.
    // Doplní je prohlížeč, až obě strategie dorazí.
    const notes: string[] = [];
    if (likelySpa) {
      notes.push(
        t(
          'Stránka vypadá jako aplikace vykreslovaná v prohlížeči (SPA). Audit pracuje se staženým HTML, takže obsah dogenerovaný JavaScriptem nevidí.',
          'The page looks like a browser-rendered application (SPA). The audit works with the downloaded HTML, so it cannot see content generated by JavaScript.',
        ),
      );
    }
    if (page.status >= 400) {
      notes.push(
        t(
          `Cílová adresa vrátila HTTP ${page.status}. Výsledky se mohou vztahovat k chybové stránce.`,
          `The target address returned HTTP ${page.status}. The results may describe an error page.`,
        ),
      );
    }
    if (page.finalUrl && page.finalUrl !== target) {
      notes.push(t(`Adresa byla přesměrována na ${page.finalUrl}.`, `The address redirected to ${page.finalUrl}.`));
    }

    return { categories, notes, blockers };
  }

  const likelySpa = detectSpa($, page.html);

  const byLocale = Object.fromEntries(LOCALES.map((code) => [code, buildFor(code)])) as Record<
    Locale,
    LocalizedAudit
  >;

  // Skóre, spolehlivost ani počet ověřených kategorií na jazyku nezávisí —
  // stavy i váhy kontrol jsou v obou verzích stejné, liší se jen texty.
  const { categories, blockers } = byLocale.cs;

  const result: AuditPayload = {
    url: target,
    finalUrl: page.finalUrl || target,
    fetchedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    overallScore: applyBlockerCap(overallScore(categories), blockers),
    meta: {
      statusCode: page.status,
      ttfbMs: page.ttfbMs,
      htmlBytes: Buffer.byteLength(page.html, 'utf8'),
      pagespeedUsedKey: false,
      pagespeedMobile: { available: false, error: null },
      pagespeedDesktop: { available: false, error: null },
      // Obě rychlostní měření si prohlížeč vyžádá zvlášť a souběžně.
      mobilePending: true,
      desktopPending: true,
      likelySpa,
      confidence: auditConfidence(categories),
      scoredCategories: categories.filter((category) => category.scored).length,
      totalCategories: categories.length,
    },
    byLocale,
  };

  logEvent('audit', {
    url: target,
    finalUrl: result.finalUrl,
    status: page.status,
    durationMs: result.durationMs,
    htmlBytes: result.meta.htmlBytes,
    ttfbMs: page.ttfbMs,
    likelySpa,
    blockers: blockers.map((blocker) => blocker.id),
    // Rychlostní kategorie tu ještě čekají na měření, proto se nelogují.
    scores: Object.fromEntries(
      categories
        .filter((category) => !category.id.startsWith('speed-'))
        .map((category) => [category.id, category.scored ? category.score : null]),
    ),
  });

  return NextResponse.json(result, {
    headers: { 'cache-control': 'no-store' },
  });
}

export function GET() {
  return NextResponse.json(
    { error: 'Použijte metodu POST s tělem { "url": "https://…" }.' },
    { status: 405 },
  );
}
