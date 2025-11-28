import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          DEFAULT: '#BD7AB3',
          dark: '#9D5A93',
          light: '#D9A5D0',
          pale: '#F3E8F1',
        },
        secondary: {
          DEFAULT: '#5DBEBD',
          dark: '#4A9E9D',
          light: '#A8E0DF',
          pale: '#E8F7F7',
        },
        // Neutral grays
        gray: {
          900: '#1A1A1A',
          800: '#2D2D2D',
          700: '#4A4A4A',
          600: '#6B6B6B',
          500: '#9B9B9B',
          400: '#C4C4C4',
          300: '#E0E0E0',
          200: '#EFEFEF',
          100: '#F7F7F7',
          50: '#FAFAFA',
        },
        // Semantic colors
        success: '#00B894',
        warning: '#FDCB6E',
        error: '#D63031',
        info: '#5DBEBD',
      },
      fontFamily: {
        sans: [
          'var(--font-manrope)',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'DEFAULT': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'md': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.16)',
        'xl': '0 12px 32px rgba(0, 0, 0, 0.20)',
      },
      borderRadius: {
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
