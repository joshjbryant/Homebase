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
        sage: {
          50:  '#e8f0eb',
          100: '#c5d9cb',
          200: '#9fc0a8',
          300: '#7aaa8a',
          400: '#5e9870',
          500: '#4a7c59',
          600: '#3d6849',
          700: '#2f5238',
          800: '#203c28',
          900: '#102719',
        },
        amber: {
          50:  '#fdf3e3',
          100: '#faddaf',
          200: '#f5c274',
          300: '#eda43c',
          400: '#d48820',
          500: '#c17a2a',
          600: '#a06320',
          700: '#7d4c18',
          800: '#5a3610',
          900: '#382008',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '375px',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}

export default config
