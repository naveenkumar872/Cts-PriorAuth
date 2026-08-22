/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0eadb9',
          50: '#f0fcfc',
          100: '#e0f7f8',
          200: '#b3edef',
          500: '#0eadb9',
          600: '#0897a3',
          700: '#067781',
        },
        success: {
          DEFAULT: '#16a34a',
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#16a34a',
          600: '#15803d',
        },
        danger: {
          DEFAULT: '#dc2626',
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#dc2626',
          600: '#b91c1c',
        },
        pending: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        sidebar: {
          DEFAULT: '#12151c',
          active: '#1e2a44',
        },
        surface: {
          light: '#ffffff',
          dark: '#181c24',
        },
        background: {
          light: '#f6f7f9',
          dark: '#12151c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '16px' }],
        'sm': ['13.5px', { lineHeight: '20px' }],
        'base': ['13.5px', { lineHeight: '20px' }],
        'lg': ['15px', { lineHeight: '24px' }],
        'xl': ['18px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      transitionDuration: {
        DEFAULT: '120ms',
      },
    },
  },
  plugins: [],
}
