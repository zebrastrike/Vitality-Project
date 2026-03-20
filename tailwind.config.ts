import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e8ff',
          200: '#c7d5fe',
          300: '#a5b8fc',
          400: '#8193f8',
          500: '#6270f2',  // primary lavender-blue (matches logo)
          600: '#4f57e2',
          700: '#3e45c8',
          800: '#343aa3',
          900: '#2e3481',
          950: '#1c1f4d',
        },
        dark: {
          900: '#0a0a0f',
          800: '#111118',
          700: '#1a1a26',
          600: '#22223a',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}

export default config
