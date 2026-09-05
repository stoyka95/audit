'use client';

import { FormEvent } from 'react';
import { useLocale } from './LocaleProvider';

interface UrlFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function UrlForm({ value, onChange, onSubmit, disabled = false, compact = false }: UrlFormProps) {
  const { t } = useLocale();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!disabled) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={`group flex items-center gap-2 rounded-full border border-line bg-surface/70 p-1.5
          transition-colors duration-300 focus-within:border-signal/50 hover:border-line
          ${compact ? 'pl-4' : 'pl-5 sm:pl-6'}`}
      >
        <span aria-hidden="true" className="hidden shrink-0 text-bone-faint sm:block">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.2" />
            <path d="M1.9 8h12.2M8 1.75c3.4 3.6 3.4 8.9 0 12.5-3.4-3.6-3.4-8.9 0-12.5Z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </span>

        <label htmlFor="audit-url" className="sr-only">
          {t.form.label}
        </label>
        <input
          id="audit-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t.form.placeholder}
          disabled={disabled}
          className={`min-w-0 flex-1 bg-transparent text-bone placeholder:text-bone-faint focus:outline-none
            disabled:opacity-50 ${compact ? 'py-2 text-sm' : 'py-2.5 text-[0.95rem] sm:text-base'}`}
        />

        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className={`btn-primary shrink-0 disabled:bg-line disabled:text-bone-faint disabled:shadow-none
            ${compact ? 'px-4 py-2 text-[0.8rem]' : 'px-5 py-2.5 text-sm sm:px-7'}`}
        >
          {disabled ? t.form.running : t.form.submit}
        </button>
      </div>
    </form>
  );
}
