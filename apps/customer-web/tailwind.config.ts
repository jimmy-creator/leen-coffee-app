import type { Config } from 'tailwindcss';

/**
 * Tailwind reads the Leen tokens from CSS variables (packages/ui/tokens.css)
 * rather than redeclaring the hex values, so the palette has exactly one home.
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
        espresso: 'var(--leen-espresso)',
        ink: {
          DEFAULT: 'var(--leen-ink)',
          2: 'var(--leen-ink-2)',
          3: 'var(--leen-ink-3)',
        },
        brown: 'var(--leen-brown)',
        caramel: 'var(--leen-caramel)',
        forest: 'var(--leen-forest)',
        leafgreen: 'var(--leen-green)',
        danger: 'var(--leen-red)',
        gold: 'var(--leen-gold)',
        canvas: 'var(--leen-canvas)',
        surface: {
          DEFAULT: 'var(--leen-surface)',
          alt: 'var(--leen-surface-alt)',
          soft: 'var(--leen-surface-soft)',
        },
        page: 'var(--leen-bg)',
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
