import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Zápis do logu.
 *
 * Každá událost jde vždycky na `console` jako jeden řádek JSON — na Vercelu je
 * to jediné, co přežije, protože souborový systém funkce je jen pro čtení.
 * Lokálně (nebo když je nastavená `AUDIT_LOG_FILE`) se stejný řádek přidá do
 * souboru, aby se dalo zpětně dohledat, které měření kdy spadlo a proč.
 *
 * Zápis je „vystřel a zapomeň": log nesmí zdržet ani shodit audit.
 */
const LOG_FILE =
  process.env.AUDIT_LOG_FILE?.trim() ||
  (process.env.VERCEL ? null : path.join(process.cwd(), 'logs', 'audit.jsonl'));

export type LogEvent = 'audit' | 'audit-error' | 'psi';

export function logEvent(event: LogEvent, data: Record<string, unknown>): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...data });

  // eslint-disable-next-line no-console -- na Vercelu je konzole jediný trvalý log
  console.log(`[audit] ${line}`);

  if (!LOG_FILE) return;

  void (async () => {
    try {
      await mkdir(path.dirname(LOG_FILE), { recursive: true });
      await appendFile(LOG_FILE, `${line}\n`, 'utf8');
    } catch {
      // Nedostupný disk nebo plná kvóta nesmí ovlivnit odpověď uživateli.
    }
  })();
}

/** Kam se zapisuje — pro poznámku v odpovědi a pro dokumentaci. */
export function logTarget(): string | null {
  return LOG_FILE;
}
