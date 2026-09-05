'use client';

import { useLocale } from '@/components/LocaleProvider';

export default function NotFound() {
  const { t } = useLocale();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <span aria-hidden="true" className="relative flex h-14 w-14 items-center justify-center">
        <span className="brand-fill absolute inset-0 rounded-2xl opacity-90" />
        <span className="relative font-display text-xl font-bold leading-none text-white">S</span>
      </span>

      <p className="mt-8 font-display text-7xl font-semibold tracking-tightest text-bone sm:text-8xl">
        <span className="brand-text">{t.notFound.code}</span>
      </p>
      <h1 className="mt-3 font-display text-xl font-semibold tracking-tight text-bone sm:text-2xl">
        {t.notFound.title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[0.9rem] leading-relaxed text-bone-dim">{t.notFound.text}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href="/" className="btn-primary px-5 py-2.5 text-sm">
          {t.notFound.backHome}
        </a>
        <a href="https://semakod.cz" target="_blank" rel="noopener" className="btn-ghost px-5 py-2.5 text-sm">
          {t.notFound.visitSemakod}
        </a>
        <a href="https://semakod.cz/sluzby/" target="_blank" rel="noopener" className="btn-ghost px-5 py-2.5 text-sm">
          {t.notFound.browseServices}
        </a>
      </div>
    </main>
  );
}
