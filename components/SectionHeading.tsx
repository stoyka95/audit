import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  align?: 'left' | 'center';
}

export default function SectionHeading({ eyebrow, title, lead, align = 'left' }: SectionHeadingProps) {
  const centered = align === 'center';
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-[1.1] tracking-tightest text-bone text-balance sm:text-[2.4rem]">
        {title}
      </h2>
      {lead ? (
        <p className="mt-4 text-[0.92rem] leading-relaxed text-bone-dim text-balance">{lead}</p>
      ) : null}
    </div>
  );
}
