/** @type {import('tailwindcss').Config} */

// Colors backed by CSS variables, with support for Tailwind opacity modifiers (bg-surface/50 etc.).
const alpha = (color, opacityValue) => {
  if (opacityValue === undefined || !/^[0-9.]+$/.test(String(opacityValue))) return color;
  const pct = Math.round(parseFloat(opacityValue) * 1000) / 10;
  return pct >= 100 ? color : `color-mix(in srgb, ${color} ${pct}%, transparent)`;
};
const v = (name) => ({ opacityValue }) => alpha(`var(${name})`, opacityValue);

// A 50-900 shade scale derived from one CSS variable, so changing the brand color in the
// admin panel recolors every indigo-*, purple-* and cyan-* class on the site.
const scale = (name) => {
  const light = (p) => `color-mix(in srgb, var(${name}) ${p}%, white)`;
  const dark = (p) => `color-mix(in srgb, var(${name}) ${p}%, black)`;
  const shades = {
    50: light(8), 100: light(16), 200: light(30), 300: light(50), 400: light(75),
    500: `var(${name})`, 600: dark(86), 700: dark(72), 800: dark(58), 900: dark(44), 950: dark(30),
  };
  return Object.fromEntries(Object.entries(shades).map(([k, c]) => [k, ({ opacityValue }) => alpha(c, opacityValue)]));
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: v('--primary'),
          hover: v('--primary-hover'),
          light: v('--primary-light'),
          ...scale('--primary'),
        },
        // Old brand palettes now follow the admin-selected brand colors
        indigo: scale('--brand-1'),
        purple: scale('--brand-2'),
        cyan: scale('--brand-3'),

        'bg-app': v('--bg-app'),
        'bg-surface': v('--bg-surface'),
        'bg-surface-elevated': v('--bg-surface-elevated'),
        'bg-surface-hover': v('--bg-surface-hover'),
        'bg-surface-subtle': v('--bg-surface-subtle'),
        'border-main': v('--border-main'),
        'border-subtle': v('--border-subtle'),
        'text-primary': v('--text-primary'),
        'text-secondary': v('--text-secondary'),
        'text-muted': v('--text-muted'),

        // Names the pages already use (previously undefined, so they had no effect)
        surface: v('--bg-surface'),
        muted: v('--bg-surface-subtle'),
        'muted-foreground': v('--text-muted'),
        secondary: v('--text-secondary'),
        danger: { DEFAULT: v('--danger'), bg: v('--danger-bg') },
        success: { DEFAULT: v('--success'), bg: v('--success-bg') },
        warning: { DEFAULT: v('--warning'), bg: v('--warning-bg') },
        info: { DEFAULT: v('--info'), bg: v('--info-bg') },
        'danger-bg': v('--danger-bg'),
        'success-bg': v('--success-bg'),
        'warning-bg': v('--warning-bg'),
        'info-bg': v('--info-bg'),
        'sidebar-text': v('--sidebar-text'),
        'sidebar-border': v('--sidebar-border'),
        'sidebar-bg': v('--sidebar-bg'),
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      }
    },
  },
  plugins: [],
}
