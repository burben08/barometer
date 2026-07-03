/**
 * Tailwind theme extension for the "Playful Neo-Brutalism" design system.
 * These values read from the CSS custom properties defined in tokens.css,
 * so light/dark mode and any future re-theming happen in one place.
 *
 * Usage in your project's tailwind.config.js:
 *
 *   const designTokens = require('./design-system/tokens/tailwind.tokens.js');
 *
 *   module.exports = {
 *     darkMode: 'class',
 *     content: [...],
 *     theme: {
 *       extend: designTokens,
 *     },
 *   };
 */
module.exports = {
  colors: {
    bg: 'rgb(var(--color-bg) / <alpha-value>)',
    surface: 'rgb(var(--color-surface) / <alpha-value>)',
    'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
    ink: 'rgb(var(--color-ink) / <alpha-value>)',
    'ink-muted': 'rgb(var(--color-ink-muted) / <alpha-value>)',
    border: 'rgb(var(--color-border) / <alpha-value>)',

    primary: 'rgb(var(--color-primary) / <alpha-value>)',
    'primary-pastel': 'rgb(var(--color-primary-pastel) / <alpha-value>)',
    secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
    'secondary-pastel': 'rgb(var(--color-secondary-pastel) / <alpha-value>)',
    'tertiary-pastel': 'rgb(var(--color-tertiary-pastel) / <alpha-value>)',

    success: 'rgb(var(--color-success) / <alpha-value>)',
    'success-pastel': 'rgb(var(--color-success-pastel) / <alpha-value>)',
    warning: 'rgb(var(--color-warning) / <alpha-value>)',
    danger: 'rgb(var(--color-danger) / <alpha-value>)',
    info: 'rgb(var(--color-info) / <alpha-value>)',
  },
  fontFamily: {
    display: ['"Space Grotesk"', 'sans-serif'],
    body: ['"Inter"', 'sans-serif'],
  },
  borderRadius: {
    chip: 'var(--radius-chip)',
    control: 'var(--radius-control)',
    card: 'var(--radius-card)',
    sheet: 'var(--radius-sheet)',
  },
  borderWidth: {
    thin: 'var(--border-thin)',
    regular: 'var(--border-regular)',
    thick: 'var(--border-thick)',
  },
  boxShadow: {
    'brutal-sm': 'var(--shadow-sm)',
    'brutal-md': 'var(--shadow-md)',
    'brutal-lg': 'var(--shadow-lg)',
  },
};
