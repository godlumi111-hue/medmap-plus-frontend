import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0D9488',
        'primary-dark': '#0F766E',
        'primary-light': '#14B8A6',
        mint: '#5EEAD4',
        aqua: '#CCFBF1',
        sky: '#0EA5E9',
        coral: '#FB7185',
        ink: '#0F172A',
        slate: '#475569',
        paper: '#F8FAFC',
        bone: '#F1F5F9',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
      },
      animation: {
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'float-fast': 'float-fast 4s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
        'blob': 'blob 8s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'float-slow': {
          '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-25px) rotate(3deg)' },
        },
        'float-fast': {
          '0%,100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-15px) translateX(8px)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'blob': {
          '0%,100%': { borderRadius: '42% 58% 70% 30% / 45% 45% 55% 55%' },
          '33%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '66%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
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
