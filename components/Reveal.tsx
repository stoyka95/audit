'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Zpoždění v ms, pro postupné nabíhání sousedních prvků. */
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}

/**
 * Odhalí obsah, až se dostane do viewportu. Staví na IntersectionObserveru
 * místo scroll listeneru, takže se nic nepočítá při každém pixelu scrollu.
 * Po prvním zobrazení se pozorování ruší — animace se nemá opakovat.
 */
export default function Reveal({ children, delay = 0, className = '', as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Bez podpory observeru (nebo při vypnutých animacích) ukážeme obsah rovnou.
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as 'div';

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${className}`}
      data-shown={shown}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
