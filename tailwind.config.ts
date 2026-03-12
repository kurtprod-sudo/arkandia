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
        // Backgrounds
        'ark-bg': {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
        },
        // Wine accent
        wine: {
          dark: 'var(--color-wine-dark)',
          mid: 'var(--color-wine-mid)',
          light: 'var(--color-wine-light)',
          glow: 'var(--color-wine-glow)',
        },
        // Bronze / Gold accent
        bronze: {
          dark: 'var(--color-bronze-dark)',
          mid: 'var(--color-bronze-mid)',
          light: 'var(--color-bronze-light)',
          glow: 'var(--color-bronze-glow)',
        },
        gold: {
          pure: 'var(--color-gold-pure)',
        },
        // Text
        'ark-text': {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        // Status
        status: {
          alive: 'var(--color-status-alive)',
          injured: 'var(--color-status-injured)',
          dead: 'var(--color-status-dead)',
        },
        // Attribute colors
        attr: {
          ataque: '#E85D4A',
          magia: '#7B68EE',
          eter: '#4FC3F7',
          defesa: '#78909C',
          vitalidade: '#66BB6A',
          velocidade: '#FFD54F',
          precisao: '#FF8A65',
          tenacidade: '#A1887F',
          capitania: '#CE93D8',
          moral: '#F48FB1',
        },
      },
      fontFamily: {
        display: ['var(--font-cinzel)', 'serif'],
        body: ['var(--font-crimson)', 'serif'],
        data: ['var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        'glow-wine': '0 0 20px rgba(196, 65, 94, 0.3), 0 0 40px rgba(196, 65, 94, 0.1)',
        'glow-bronze': '0 0 20px rgba(196, 154, 74, 0.3), 0 0 40px rgba(196, 154, 74, 0.1)',
        'glow-gold': '0 0 20px rgba(245, 212, 133, 0.35), 0 0 50px rgba(245, 212, 133, 0.15)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'particle-float': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%': { transform: 'translateY(-4px) rotate(1deg)' },
          '66%': { transform: 'translateY(2px) rotate(-1deg)' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'particle-float': 'particle-float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
