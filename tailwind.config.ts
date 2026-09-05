import type { Config } from 'tailwindcss';

/** Barvy míří na CSS proměnné, aby fungoval přepínač motivu bez duplikace tříd. */
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: token('canvas'),
          2: token('canvas-2'),
        },
        surface: token('surface'),
        inset: token('inset'),
        line: token('line'),
        bone: {
          DEFAULT: token('bone'),
          dim: token('bone-dim'),
          faint: token('bone-faint'),
        },
        signal: {
          DEFAULT: token('signal'),
          soft: token('signal-soft'),
        },
        'on-signal': token('on-signal'),
        /* Inkoust = obrácený motiv, drží hlavní tlačítka černobílá. */
        ink: {
          DEFAULT: token('ink'),
          soft: token('ink-soft'),
        },
        'on-ink': token('on-ink'),
        grad: {
          a: token('grad-a'),
          b: token('grad-b'),
        },
        state: {
          pass: token('pass'),
          warn: token('warn'),
          fail: token('fail'),
          unknown: token('unknown'),
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'ui-sans-serif', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.035em',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(320%)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
        /* Animace čekacího stavu */
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.06)', opacity: '0.85' },
        },
        'tip-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-160% 0' },
          '100%': { backgroundPosition: '260% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        sweep: 'sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
        orbit: 'orbit 6s linear infinite',
        'orbit-slow': 'orbit 11s linear infinite',
        float: 'float 4s ease-in-out infinite',
        breathe: 'breathe 3.4s ease-in-out infinite',
        'tip-in': 'tip-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
