import type { Config } from 'tailwindcss';

/**
 * Tailwind reads the Leen tokens from CSS variables (packages/ui/tokens.css)
 * rather than redeclaring the hex values, so the palette has exactly one home
 * and dark mode is a variable swap rather than a second set of classes.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--leen-brand)',
          deep: 'var(--leen-brand-deep)',
          mid: 'var(--leen-brand-mid)',
        },
        accent: 'var(--leen-accent)',
        // Pre-mixed tints; see tokens.css for why these are not opacity modifiers.
        'brand-tint': 'var(--leen-brand-tint)',
        'accent-tint': 'var(--leen-accent-tint)',
        'live-tint': 'var(--leen-live-tint)',
        'danger-tint': 'var(--leen-danger-tint)',
        live: 'var(--leen-live)',
        danger: {
          DEFAULT: 'var(--leen-danger)',
          ink: 'var(--leen-danger-ink)',
        },
        ink: {
          DEFAULT: 'var(--leen-ink)',
          2: 'var(--leen-ink-2)',
          3: 'var(--leen-ink-3)',
          4: 'var(--leen-ink-4)',
        },
        page: 'var(--leen-bg)',
        canvas: 'var(--leen-canvas)',
        surface: {
          DEFAULT: 'var(--leen-surface)',
          alt: 'var(--leen-surface-alt)',
          soft: 'var(--leen-surface-soft)',
          muted: 'var(--leen-surface-muted)',
        },
        hair: 'var(--leen-hair)',
        line: 'var(--leen-border)',
      },
      fontFamily: {
        sans: ['var(--font-plex-arabic)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
