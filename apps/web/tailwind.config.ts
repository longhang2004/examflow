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
        parchment: '#f5f5f7',
        ivory: '#ffffff',
        terracotta: {
          DEFAULT: '#0071e3',
          light: '#0077ed',
        },
        sand: '#fafafc',
        charcoal: {
          DEFAULT: '#1d1d1f',
          warm: '#424245',
        },
        olive: '#515154',
        stone: '#6e6e73',
        silver: '#f5f5f7',
        nearblack: '#1d1d1f',
        darksurface: '#272729',
        border: {
          cream: '#e5e5ea',
          warm: '#d2d2d7',
          dark: '#424245',
        },
        ring: {
          warm: '#d2d2d7',
          deep: '#c7c7cc',
        },
        error: '#b53333',
        focus: '#0071e3',
        link: {
          DEFAULT: '#0066cc',
          bright: '#2997ff',
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
