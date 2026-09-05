'use client';

import { useEffect, useRef } from 'react';

/**
 * Mřížka bodů za obsahem. V klidu ji pod kurzorem rozsvěcí bodová záře,
 * během auditu kurzor ignoruje a světlo obchází stránku samo.
 *
 * Pozice se zapisuje přímo do CSS proměnných v rAF smyčce. Přes React state
 * by to znamenalo překreslení celé stránky několikrát za sekundu.
 */
export default function AmbientPattern({ busy }: { busy: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    // Na dotyku není co sledovat, při redukovaném pohybu má vrstva zůstat klidná.
    if (still || (!fine && !busy)) return;

    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let targetX = x;
    let targetY = y;
    let lit = busy;
    const started = performance.now();

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!lit) {
        // První pohyb — než se světlo rozsvítí, ať se nepřiplazí ze středu.
        lit = true;
        x = targetX;
        y = targetY;
      }
      node.dataset.lit = 'true';
    };

    const onLeave = () => {
      node.dataset.lit = 'false';
    };

    if (busy) {
      node.dataset.lit = 'true';
    } else {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }

    const tick = (now: number) => {
      if (busy) {
        // Dvě nesouměřitelné frekvence — dráha se hned neopakuje.
        const t = (now - started) / 1000;
        targetX = window.innerWidth * (0.5 + 0.34 * Math.sin(t * 0.41));
        targetY = window.innerHeight * (0.5 + 0.3 * Math.sin(t * 0.67 + 1.1));
      }

      // Doběh, ať světlo za kurzorem plyne a neskáče.
      x += (targetX - x) * 0.14;
      y += (targetY - y) * 0.14;
      node.style.setProperty('--px', `${Math.round(x)}px`);
      node.style.setProperty('--py', `${Math.round(y)}px`);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [busy]);

  return (
    <div ref={root} aria-hidden="true" className="pattern" data-busy={busy} data-lit="false">
      <span className="pattern-base" />
      <span className="pattern-glow pattern-glow-a" />
      <span className="pattern-glow pattern-glow-b" />
    </div>
  );
}
