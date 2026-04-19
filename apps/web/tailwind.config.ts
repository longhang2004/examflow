import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: '#f5f4ed',
        ivory: '#faf9f5',
        terracotta: {
          DEFAULT: '#c96442',
          light: '#d97757',
        },
        sand: '#e8e6dc',
        charcoal: {
          DEFAULT: '#4d4c48',
          warm: '#3d3d3a',
        },
        olive: '#5e5d59',
        stone: '#87867f',
        silver: '#b0aea5',
        nearblack: '#141413',
        darksurface: '#30302e',
        border: {
          cream: '#f0eee6',
          warm: '#e8e6dc',
          dark: '#30302e',
        },
        ring: {
          warm: '#d1cfc5',
          deep: '#c2c0b6',
        },
        error: '#b53333',
        focus: '#3898ec',
        primary: {
          DEFAULT: '#c96442',
          50: '#fdf5f0',
          100: '#fce8dd',
          500: '#d97757',
          600: '#c96442',
          700: '#b8563a',
          800: '#a04c34',
          900: '#7c3d2c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        subtle: '6px',
        comfortable: '8px',
        generous: '12px',
        'very-rounded': '16px',
        highlight: '24px',
        maximum: '32px',
      },
      boxShadow: {
        ring: '0px 0px 0px 1px #d1cfc5',
        'ring-deep': '0px 0px 0px 1px #c2c0b6',
        'ring-brand': '0px 0px 0px 1px #c96442',
        whisper: 'rgba(0,0,0,0.05) 0px 4px 24px',
        'ring-dark': '0px 0px 0px 1px #30302e',
      },
      lineHeight: {
        tight: '1.10',
        snug: '1.20',
        reading: '1.30',
        relaxed: '1.60',
      },
    },
  },
  plugins: [],
}

export default config
