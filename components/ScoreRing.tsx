'use client';

import { useEffect, useState } from 'react';
import { scoreBand } from '@/lib/scoring';

/** Barvy míří na tokeny, aby kruh seděl do světlého i tmavého motivu. */
const BAND_VAR: Record<string, string> = {
  great: 'var(--c-pass)',
  good: 'var(--c-pass)',
  average: 'var(--c-warn)',
  poor: 'var(--c-fail)',
};

interface ScoreRingProps {
  score: number;
  size?: number;
  stroke?: number;
  /** false = kategorii se nepodařilo vyhodnotit. */
  scored?: boolean;
  label?: string;
}

export default function ScoreRing({ score, size = 132, stroke = 8, scored = true, label }: ScoreRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));

  // Kruh se dokresluje z nuly, aby výsledek „dojel" před očima místo skoku.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const dash = scored && drawn ? (clamped / 100) * circumference : 0;
  const color = scored ? `rgb(${BAND_VAR[scoreBand(clamped)]})` : 'rgb(var(--c-unknown))';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--c-line))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{
            transition: 'stroke-dasharray 1100ms cubic-bezier(0.16, 1, 0.3, 1), stroke 300ms ease',
            filter: scored ? `drop-shadow(0 0 6px ${color}55)` : undefined,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-semibold leading-none tracking-tight tnum"
          style={{ fontSize: size * 0.34, color: scored ? 'rgb(var(--c-bone))' : 'rgb(var(--c-unknown))' }}
        >
          {scored ? clamped : '—'}
        </span>
        {label ? (
          <span className="mt-1 text-[0.6rem] uppercase tracking-[0.2em] text-bone-faint">{label}</span>
        ) : null}
      </div>
    </div>
  );
}
