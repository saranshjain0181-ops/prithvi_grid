import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        prithvi: {
          green: '#22C55E',
          yellow: '#EAB308',
          blue: '#3B82F6',
          red: '#EF4444',
          cream: '#FDFBF7',
          slate: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
