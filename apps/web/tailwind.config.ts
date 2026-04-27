import type { Config } from 'tailwindcss'

/**
 * Tokens map to Apple-inspired values (see apps/web/DESIGN.md).
 * Legacy names (parchment, terracotta, etc.) are kept so existing classes
 * stay stable; terracotta → Apple Blue for primary actions.
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: 'rgb(var(--color-page) / <alpha-value>)',
        ivory: 'rgb(var(--color-surface) / <alpha-value>)',
        terracotta: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          light: 'rgb(var(--color-accent-light) / <alpha-value>)',
        },
        sand: 'rgb(var(--color-soft) / <alpha-value>)',
        charcoal: {
          DEFAULT: 'rgb(var(--color-text) / <alpha-value>)',
          warm: 'rgb(var(--color-muted-text) / <alpha-value>)',
        },
        olive: 'rgb(var(--color-muted-text) / <alpha-value>)',
        stone: 'rgb(var(--color-subtle-text) / <alpha-value>)',
        silver: 'rgb(var(--color-page) / <alpha-value>)',
        nearblack: 'rgb(var(--color-text) / <alpha-value>)',
        darksurface: 'rgb(var(--color-soft) / <alpha-value>)',
        border: {
          cream: 'rgb(var(--color-border) / <alpha-value>)',
          warm: 'rgb(var(--color-border-strong) / <alpha-value>)',
          dark: 'rgb(var(--color-border-strong) / <alpha-value>)',
        },
        ring: {
          warm: 'rgb(var(--color-border-strong) / <alpha-value>)',
          deep: 'rgb(var(--color-border-strong) / <alpha-value>)',
        },
        error: 'rgb(var(--color-error) / <alpha-value>)',
        focus: 'rgb(var(--color-accent) / <alpha-value>)',
        link: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          bright: 'rgb(var(--color-accent-light) / <alpha-value>)',
        },
        primary: {
          DEFAULT: '#0071e3',
          50: '#e8f2ff',
          100: '#cce4ff',
          500: '#2997ff',
          600: '#0071e3',
          700: '#0058b0',
          800: '#004494',
          900: '#003571',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        serif: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        subtle: '5px',
        comfortable: '8px',
        generous: '12px',
        'very-rounded': '16px',
        highlight: '24px',
        maximum: '32px',
        pill: '980px',
      },
      boxShadow: {
        ring: '0px 0px 0px 1px #d2d2d7',
        'ring-deep': '0px 0px 0px 1px #c7c7cc',
        'ring-brand': '0px 0px 0px 1px #0071e3',
        whisper: 'rgba(0, 0, 0, 0.22) 3px 5px 30px 0px',
        'ring-dark': '0px 0px 0px 1px #424245',
        card: 'rgba(0, 0, 0, 0.22) 3px 5px 30px 0px',
      },
      lineHeight: {
        tight: '1.07',
        snug: '1.14',
        reading: '1.3',
        relaxed: '1.47',
      },
    },
  },
  plugins: [],
}

export default config
