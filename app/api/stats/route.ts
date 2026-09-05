import { NextResponse } from 'next/server';

import { counterIsPersistent, readAuditRuns, readVisitors, roundCount } from '@/lib/counter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Čísla pro patičku: kolik auditů doběhlo a kolik různých lidí je spustilo.
 *
 * Obojí odchází ven už zaokrouhlené — zaokrouhlovat až v prohlížeči by znamenalo
 * posílat přesná čísla, která nikdo nepotřebuje. `persistent: false` říká patičce,
 * že počítadla nemají trvalé úložiště a nemá se ukazovat nic.
 */
export async function GET() {
  const persistent = counterIsPersistent();

  if (!persistent) {
    return NextResponse.json({ audits: null, people: null, persistent });
  }

  const [runs, visitors] = await Promise.all([readAuditRuns(), readVisitors()]);

  return NextResponse.json(
    { audits: roundCount(runs), people: roundCount(visitors), persistent },
    // Patička není ciferník: pár minut staré číslo je v pořádku a ušetří to
    // dvě čtení z úložiště na každé načtení stránky.
    { headers: { 'cache-control': 'public, s-maxage=120, stale-while-revalidate=600' } },
  );
}
