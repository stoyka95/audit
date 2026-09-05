'use client';

import { useId } from 'react';
import { BRAND_LOGO_PATHS, BRAND_LOGO_VIEWBOX } from '@/lib/brandLogo';

/**
 * Skutečné logo Semakodu, přebarvené do firemního přechodu webu (modrá →
 * fialová) místo původních čtyř barev. Kreslí se přímo v DOMu (ne přes
 * <img>), takže gradient čte živé CSS proměnné --c-grad-a/--c-grad-b a
 * sám se přepne se světlým/tmavým motivem — přesně jako zbytek brandingu.
 *
 * `useId` dává gradientu unikátní id při každém vykreslení — loga se
 * zobrazují víckrát najednou (nav + patička) a duplicitní id by se
 * v SVG referencovalo nespolehlivě.
 */
export default function BrandLogo({ className }: { className?: string }) {
  const gradId = useId();

  return (
    <svg viewBox={BRAND_LOGO_VIEWBOX} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(var(--c-grad-a))" />
          <stop offset="100%" stopColor="rgb(var(--c-grad-b))" />
        </linearGradient>
      </defs>
      {BRAND_LOGO_PATHS.map((d) => (
        <path key={d.slice(0, 24)} fill={`url(#${gradId})`} fillRule="evenodd" d={d} />
      ))}
    </svg>
  );
}
