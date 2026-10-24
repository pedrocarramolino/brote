/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: { xs: '400px' },
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        surface2: v('surface-2'),
        line: v('line'),
        ink: v('ink'),
        ink2: v('ink-2'),
        ink3: v('ink-3'),
        accent: v('accent'),
        accentInk: v('accent-ink'),
        accentSoft: v('accent-soft'),
        protein: v('protein'),
        carbs: v('carbs'),
        fat: v('fat'),
        warn: v('warn'),
        warnSoft: v('warn-soft'),
        danger: v('danger'),
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', 'Inter', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        rounded: ['ui-rounded', '"SF Pro Rounded"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem', xl3: '1.75rem' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 1px rgb(0 0 0 / 0.02)',
        float: '0 8px 30px rgb(0 0 0 / 0.12), 0 2px 6px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
