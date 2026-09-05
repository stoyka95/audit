import type { CheerioAPI } from 'cheerio';
import type { Locale } from './i18n';

/** Stav jedné kontroly. `unknown` = nepodařilo se ověřit, do skóre se nepočítá. */
export type CheckStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export type CategoryId = 'speed-mobile' | 'speed-desktop' | 'seo' | 'aeo' | 'geo' | 'tech';

/** Zařízení, pro které PageSpeed Insights měří. */
export type PsiStrategy = 'mobile' | 'desktop';

/** Volitelná strukturovaná data pro speciální render v UI. */
export type CheckMeta =
  | { kind: 'bots'; rows: BotRow[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'links'; items: BrokenLinkRow[] };

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  /** Naměřená hodnota, např. "3,1 s" nebo "62 znaků". */
  value?: string;
  /** Váha kontroly ve skóre kategorie (3 = kritické, 0 = jen informativní). */
  weight: number;
  /**
   * Spojité skóre 0–1 pro měřitelné metriky. Když chybí, použije se plošná
   * hodnota podle stavu (pass 1 / warn 0,5 / fail 0). Díky tomu se LCP 2,6 s
   * a LCP 3,9 s liší, i když mají oba stav `warn`.
   */
  score?: number;
  /** Statický, pravidly vybraný text: co to znamená a jak to opravit. */
  detail: string;
  /**
   * Když je vyplněné a kontrola skončí jako `fail`, jde o fatální nález —
   * web kvůli němu nemůže fungovat ve vyhledávání. Celkové skóre se pak
   * zastropuje, aby report nehlásil „Dobré" u webu, který není vidět.
   */
  blocker?: string;
  /**
   * true = řádek se v reportu vykreslí zvýrazněně. Používá se pro souhrnné
   * Performance skóre, které je z celé kategorie to jediné číslo, jaké lidé
   * znají odjinud, a v běžné řádce zanikalo.
   */
  featured?: boolean;
  meta?: CheckMeta;
}

export interface BlockerRow {
  id: string;
  label: string;
  reason: string;
}

export interface CategoryResult {
  id: CategoryId;
  title: string;
  subtitle: string;
  score: number;
  /** Nezaokrouhlené skóre; celkový průměr se počítá z něj. */
  scoreRaw: number;
  /** false = ověřená váha nedosáhla prahu, kategorie do celkového skóre nejde. */
  scored: boolean;
  /** Podíl ověřené váhy v kategorii, 0–1. */
  confidence: number;
  checks: CheckResult[];
}

export interface AuditMeta {
  statusCode: number;
  ttfbMs: number | null;
  htmlBytes: number;
  pagespeedUsedKey: boolean;
  pagespeedMobile: { available: boolean; error: string | null };
  pagespeedDesktop: { available: boolean; error: string | null };
  /**
   * true = rychlostní měření si prohlížeč teprve vyžádá samostatným requestem.
   * Obě strategie běží mimo hlavní audit, každá s vlastním rozpočtem funkce.
   */
  mobilePending: boolean;
  desktopPending: boolean;
  likelySpa: boolean;
  /** Podíl ověřené váhy napříč celým auditem, 0–1. */
  confidence: number;
  scoredCategories: number;
  totalCategories: number;
}

/** Jazykově závislá část reportu. Čísla i stavy jsou v obou jazycích stejné. */
export interface LocalizedAudit {
  categories: CategoryResult[];
  notes: string[];
  /** Fatální nálezy, kvůli kterým je celkové skóre zastropované. */
  blockers: BlockerRow[];
}

/**
 * Co vrací API. Report vzniká rovnou v obou jazycích — kontroly jsou čisté
 * funkce nad už naparsovaným DOMem, takže druhé vyhodnocení stojí zlomek
 * milisekundy a v odpovědi pár kilobajtů. Bez toho by přepnutí jazyka nad
 * hotovým reportem znamenalo celý audit znovu, včetně měření u Googlu.
 */
export interface AuditPayload {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  durationMs: number;
  overallScore: number;
  meta: AuditMeta;
  byLocale: Record<Locale, LocalizedAudit>;
}

/** Report tak, jak ho vykresluje prohlížeč: vybraný jazyk plus obě verze pro přepnutí. */
export interface AuditResult extends LocalizedAudit {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  durationMs: number;
  overallScore: number;
  meta: AuditMeta;
  byLocale: Record<Locale, LocalizedAudit>;
}

export interface AuditError {
  error: string;
  detail?: string;
}

/* ---------- pomocné datové struktury ---------- */

export type BotCategory = 'training' | 'search';
export type BotState = 'allowed' | 'disallowed' | 'partial' | 'unmentioned' | 'unknown';

export interface BotRow {
  bot: string;
  vendor: string;
  category: BotCategory;
  state: BotState;
  /** Odkud pravidlo pochází: explicitní záznam bota, nebo fallback na `*`. */
  source: 'explicit' | 'wildcard' | 'none';
  rule?: string;
}

export interface BrokenLinkRow {
  url: string;
  status: number | null;
  note: string;
}

export interface RobotsGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
}

export interface RobotsFile {
  exists: boolean;
  groups: RobotsGroup[];
  sitemaps: string[];
  /** Zmiňuje robots.txt kdekoli `llms.txt`? */
  mentionsLlmsTxt: boolean;
  raw: string;
}

export interface PageSpeedResult {
  available: boolean;
  /** true = měření teprve poběží v samostatném požadavku, není to selhání. */
  pending?: boolean;
  usedKey: boolean;
  error: string | null;
  performanceScore: number | null;
  lcpMs: number | null;
  clsValue: number | null;
  inpMs: number | null;
  inpSource: 'field' | null;
  tbtMs: number | null;
  fcpMs: number | null;
  fieldDataAvailable: boolean;
}

export interface FetchedPage {
  ok: boolean;
  status: number;
  finalUrl: string;
  html: string;
  headers: Record<string, string>;
  ttfbMs: number | null;
  error?: string;
}

export interface TextResource {
  exists: boolean;
  status: number | null;
  text: string;
  finalUrl: string | null;
  /** true = síťová chyba / timeout, tedy nelze rozhodnout. */
  failed: boolean;
}

export interface AuditContext {
  targetUrl: URL;
  /** Jazyk textů kontrol. Kontroly se vyhodnocují stejně, mění se jen texty. */
  locale: Locale;
  page: FetchedPage;
  $: CheerioAPI;
  robots: RobotsFile;
  robotsFailed: boolean;
  llms: TextResource;
  sitemap: TextResource;
  sitemapFromRobots: string | null;
  jsonLd: JsonLdEntry[];
  psiMobile: PageSpeedResult;
  psiDesktop: PageSpeedResult;
  brokenLinks: BrokenLinkScan;
  faviconLive: boolean | null;
}

export interface JsonLdEntry {
  /** Rozbalený objekt (včetně položek z @graph). */
  data: Record<string, unknown>;
  types: string[];
}

export interface BrokenLinkScan {
  checked: number;
  totalFound: number;
  broken: BrokenLinkRow[];
  failed: boolean;
}

/** Stav jednoho kroku na čekací obrazovce. */
export type StepState = 'waiting' | 'running' | 'done' | 'failed';

export interface LoadStep {
  id: string;
  label: string;
  hint: string;
  state: StepState;
  /** Co konkrétně vyšlo, jakmile krok doběhne. */
  note?: string;
}
