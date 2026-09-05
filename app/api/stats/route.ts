import { NextResponse } from 'next/server';

import { counterIsPersistent, readAuditRuns, roundRuns } from '@/lib/counter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Počet spuštěných auditů pro patičku.
 *
 * `display` je už zaokrouhlené — zaokrouhlovat až v prohlížeči by znamenalo
 * posílat ven přesné číslo, které nikdo nepotřebuje. `persistent: false` říká
 * patičce, že počítadlo nemá trvalé úložiště a číslo se nemá ukazovat vůbec.
 */
export async function GET() {
  const persistent = counterIsPersistent();
  const total = persistent ? await readAuditRuns() : 0;

  return NextResponse.json(
    { display: persistent ? roundRuns(total) : null, persistent },
    // Patička není ciferník: pár minut staré číslo je v pořádku a ušetří to
    // jedno čtení z úložiště na každé načtení stránky.
    { headers: { 'cache-control': 'public, s-maxage=120, stale-while-revalidate=600' } },
  );
}
