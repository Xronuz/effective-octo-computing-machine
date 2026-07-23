/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* primary → navy (mavjud primary-* klasslar saqlanadi, qiymatlar navy) */
        primary: {
          50: '#eef2f8',
          100: '#dce5f0',
          200: '#b9c9de',
          300: '#8fa9c9',
          400: '#5f82ae',
          500: '#3d6196',
          600: '#2b4e8a',
          700: '#1b3a66',
          800: '#12294a',
          900: '#0a1e3c',
        },
        navy: {
          600: '#2b4e8a',
          700: '#1b3a66',
          800: '#12294a',
          900: '#0a1e3c',
        },
        accent: {
          DEFAULT: '#c9a227',
          hover: '#b3901f',
          soft: 'rgba(201, 162, 39, 0.12)',
        },
        danger: {
          50: '#fdf3f2',
          100: '#fbe5e3',
          500: '#c0392b',
          600: '#c0392b',
          700: '#96291f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(10, 30, 60, 0.05)',
        card: '0 4px 20px rgba(10, 30, 60, 0.07)',
        lift: '0 8px 30px rgba(10, 30, 60, 0.12)',
      },
      borderRadius: {
        card: '20px',
        inner: '12px',
        control: '10px',
      },
    },
  },
  plugins: [],
};
